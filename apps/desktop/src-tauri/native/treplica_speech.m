// Native macOS speech recognition bridge (SFSpeechRecognizer), exposed to Rust
// through a tiny C ABI. Compiled by build.rs only on macOS, with ARC enabled
// (-fobjc-arc), and linked against the Speech and Foundation frameworks.
//
// Design: the existing transcription pipeline already produces one WAV file per
// VAD segment, so we use SFSpeechURLRecognitionRequest per chunk (no streaming
// plumbing needed). Each call is synchronous from the caller's point of view —
// it blocks on a semaphore until the framework delivers the final result on its
// own background queue. The caller MUST invoke this off the main thread (the
// app does, via tokio::spawn_blocking) so we never deadlock the run loop.

#import <Foundation/Foundation.h>
#import <Speech/Speech.h>
#include <string.h>  // strncpy

// Result codes shared with the Rust side (see macos_speech.rs).
#define TRP_OK 0
#define TRP_ERR_ARGS -1
#define TRP_ERR_AUTH -2
#define TRP_ERR_UNAVAILABLE -3
#define TRP_ERR_RECOGNITION -4
#define TRP_ERR_TIMEOUT -5

// 1 if the OS provides SFSpeechRecognizer (macOS 10.15+), else 0.
int treplica_macos_speech_supported(void) {
    if (@available(macOS 10.15, *)) {
        return 1;
    }
    return 0;
}

// Blocks until speech-recognition authorization is resolved. Prompts the user
// the first time (NSSpeechRecognitionUsageDescription must be in Info.plist).
static int trp_wait_authorization(void) API_AVAILABLE(macos(10.15)) {
    SFSpeechRecognizerAuthorizationStatus status = [SFSpeechRecognizer authorizationStatus];
    if (status == SFSpeechRecognizerAuthorizationStatusNotDetermined) {
        dispatch_semaphore_t sem = dispatch_semaphore_create(0);
        __block SFSpeechRecognizerAuthorizationStatus resolved =
            SFSpeechRecognizerAuthorizationStatusNotDetermined;
        [SFSpeechRecognizer requestAuthorization:^(SFSpeechRecognizerAuthorizationStatus s) {
            resolved = s;
            dispatch_semaphore_signal(sem);
        }];
        // Allow time for the user to answer the system prompt.
        dispatch_semaphore_wait(sem, dispatch_time(DISPATCH_TIME_NOW,
                                                   (int64_t)(60.0 * NSEC_PER_SEC)));
        status = resolved;
    }
    return status == SFSpeechRecognizerAuthorizationStatusAuthorized ? TRP_OK : TRP_ERR_AUTH;
}

// Transcribes a WAV file at `wav_path` using the given `locale_id` (e.g.
// "pt-BR"); pass an empty string to use the system locale. When
// `prefer_on_device` is non-zero and the locale supports it, recognition runs
// fully on-device (offline, private). The UTF-8 transcript is copied into
// `out_buf` (NUL-terminated, truncated to `out_cap`). Returns a TRP_* code.
int treplica_macos_transcribe_wav(const char *wav_path,
                                  const char *locale_id,
                                  int prefer_on_device,
                                  char *out_buf,
                                  size_t out_cap) {
    if (wav_path == NULL || out_buf == NULL || out_cap == 0) {
        return TRP_ERR_ARGS;
    }
    if (@available(macOS 10.15, *)) {
        @autoreleasepool {
            int auth = trp_wait_authorization();
            if (auth != TRP_OK) {
                return auth;
            }

            NSString *path = [NSString stringWithUTF8String:wav_path];
            if (path == nil) {
                return TRP_ERR_ARGS;
            }
            NSURL *url = [NSURL fileURLWithPath:path];

            SFSpeechRecognizer *recognizer = nil;
            if (locale_id != NULL && locale_id[0] != '\0') {
                NSString *lid = [NSString stringWithUTF8String:locale_id];
                NSLocale *locale = [NSLocale localeWithLocaleIdentifier:lid];
                recognizer = [[SFSpeechRecognizer alloc] initWithLocale:locale];
            } else {
                recognizer = [[SFSpeechRecognizer alloc] init]; // current system locale
            }
            if (recognizer == nil || !recognizer.isAvailable) {
                return TRP_ERR_UNAVAILABLE;
            }

            SFSpeechURLRecognitionRequest *request =
                [[SFSpeechURLRecognitionRequest alloc] initWithURL:url];
            request.shouldReportPartialResults = NO;
            if (prefer_on_device && recognizer.supportsOnDeviceRecognition) {
                request.requiresOnDeviceRecognition = YES;
            }

            __block NSString *finalText = nil;
            __block BOOL finished = NO;
            __block int code = TRP_ERR_RECOGNITION;
            dispatch_semaphore_t sem = dispatch_semaphore_create(0);

            [recognizer recognitionTaskWithRequest:request
                                     resultHandler:^(SFSpeechRecognitionResult *result,
                                                     NSError *error) {
                if (finished) {
                    return;
                }
                if (error != nil) {
                    code = TRP_ERR_RECOGNITION;
                    finished = YES;
                    dispatch_semaphore_signal(sem);
                    return;
                }
                if (result != nil && result.isFinal) {
                    finalText = result.bestTranscription.formattedString;
                    code = TRP_OK;
                    finished = YES;
                    dispatch_semaphore_signal(sem);
                }
            }];

            long timed_out = dispatch_semaphore_wait(
                sem, dispatch_time(DISPATCH_TIME_NOW, (int64_t)(25.0 * NSEC_PER_SEC)));
            if (timed_out != 0) {
                return TRP_ERR_TIMEOUT;
            }
            if (code != TRP_OK) {
                return code;
            }

            const char *utf8 = (finalText != nil) ? [finalText UTF8String] : NULL;
            if (utf8 == NULL) {
                out_buf[0] = '\0';
                return TRP_OK;
            }
            strncpy(out_buf, utf8, out_cap - 1);
            out_buf[out_cap - 1] = '\0';
            return TRP_OK;
        }
    }
    return TRP_ERR_UNAVAILABLE;
}
