mod audio;
mod commands;
mod documents;
mod logging;
mod providers;
mod sessions;
mod shortcuts;
mod stealth;
mod storage;

use local_store::provider_repository::ProviderRepository;
use tauri::{Emitter, Manager, WindowEvent};

use commands::session_commands::active_session_requires_leave_prompt;

use shortcuts::register_all;
use stealth::window::{StealthService, StealthState};
use storage::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().expect("app data dir");
            std::fs::create_dir_all(&data_dir).ok();
            let db_path = data_dir.join("treplica.db");
            let conn =
                local_store::database::open_and_migrate(&db_path).expect("database initialization");
            let app_state = AppState::new(conn, data_dir);
            {
                let guard = app_state.db.lock().expect("db lock");
                let repo = local_store::repositories::StoreRepositories::new(&guard);
                let _ = ProviderRepository::new(repo.conn()).ensure_default_profile();
                let _ = ProviderRepository::new(repo.conn()).ensure_default_ollama();
                let _ = ProviderRepository::new(repo.conn()).ensure_full_capabilities();
                // Close any sessions that were left open by a previous crash or force-close.
                let _ = repo.close_orphaned_sessions();
            }
            let hotkey = app_state
                .app_settings
                .get()
                .map(|s| s.stealth_hotkey)
                .unwrap_or_else(|_| "Ctrl+Shift+H".into());
            app.manage(app_state);
            let stealth_state = StealthState::new(hotkey);
            app.manage(stealth_state);
            if let Some(stealth) = app.try_state::<StealthState>() {
                let _ = StealthService::configure_stealth_window(app.handle(), &stealth);
            }
            if let Some(main_win) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                let main_clone = main_win.clone();
                main_win.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let needs_prompt = app_handle
                            .try_state::<AppState>()
                            .map(|state| {
                                active_session_requires_leave_prompt(&state).unwrap_or(false)
                            })
                            .unwrap_or(false);
                        if needs_prompt {
                            let _ = app_handle.emit_to("main", "main-close-requested", ());
                        } else {
                            let _ = main_clone.hide();
                            if let Some(state) = app_handle.try_state::<AppState>() {
                                commands::audio_capture_commands::stop_native_system_audio_internal(
                                    &state, None,
                                );
                                commands::audio_capture_commands::stop_native_microphone_internal(
                                    &state, None,
                                );
                                let _ = state.audio_capture.release_mode("microphone", "main");
                                let _ = state.audio_capture.release_mode("system", "main");
                            }
                        }
                    }
                });
            }
            if let Some(stealth_win) = app.get_webview_window(stealth::window::STEALTH_WINDOW_LABEL)
            {
                let app_handle = app.handle().clone();
                stealth_win.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let needs_prompt = app_handle
                            .try_state::<AppState>()
                            .map(|state| {
                                active_session_requires_leave_prompt(&state).unwrap_or(false)
                            })
                            .unwrap_or(false);
                        if needs_prompt {
                            let _ = app_handle.emit_to(
                                stealth::window::STEALTH_WINDOW_LABEL,
                                "overlay-hide-requested",
                                (),
                            );
                        } else if let Some(stealth) = app_handle.try_state::<StealthState>() {
                            let _ =
                                stealth::window::StealthService::hide_overlay(&app_handle, &stealth);
                        }
                    }
                });
            }
            register_all(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::session_commands::get_active_session_summary,
            commands::session_commands::acknowledge_session_hosted_data,
            commands::session_commands::create_session,
            commands::session_commands::start_session,
            commands::session_commands::pause_session,
            commands::session_commands::resume_session,
            commands::session_commands::end_session,
            commands::session_commands::append_transcript,
            commands::session_commands::request_guidance,
            commands::session_commands::request_contextual_guidance,
            commands::session_commands::analyze_session_image,
            commands::session_commands::ingest_live_transcript,
            commands::session_commands::ingest_system_audio_chunk,
            commands::session_commands::simulate_transcript_tick,
            commands::session_commands::copy_suggestion,
            commands::session_commands::save_suggestion,
            commands::session_commands::get_live_session_state,
            commands::translation_commands::set_session_target_language,
            commands::translation_commands::translate_transcript_segment,
            commands::context_commands::get_assistant_preferences,
            commands::context_commands::save_assistant_preferences,
            commands::context_commands::get_session_context,
            commands::context_commands::update_session_context,
            commands::context_commands::parse_meeting_document,
            commands::history_commands::list_session_history,
            commands::history_commands::rename_session,
            commands::history_commands::get_session_detail,
            commands::history_commands::generate_session_document,
            commands::history_commands::export_session_document,
            commands::history_commands::delete_generated_document,
            commands::history_commands::delete_session,
            commands::provider_commands::list_provider_configs,
            commands::provider_commands::get_transcription_availability,
            commands::provider_commands::create_provider_config,
            commands::provider_commands::update_provider_config,
            commands::provider_commands::enable_provider_config,
            commands::provider_commands::disable_provider_config,
            commands::provider_commands::delete_provider_config,
            commands::provider_commands::test_provider_config,
            commands::model_commands::list_model_tasks,
            commands::model_commands::get_model_routing,
            commands::model_commands::update_model_routing,
            commands::model_commands::test_model_task,
            commands::settings_commands::get_privacy_settings,
            commands::settings_commands::update_privacy_settings,
            commands::settings_commands::acknowledge_hosted_provider_warning,
            commands::settings_commands::get_accessibility_settings,
            commands::settings_commands::update_accessibility_settings,
            commands::settings_commands::get_stealth_status,
            commands::settings_commands::toggle_stealth_overlay,
            commands::settings_commands::show_stealth_overlay,
            commands::settings_commands::hide_stealth_overlay,
            commands::settings_commands::set_stealth_always_on_top,
            commands::storage_commands::get_documents_storage_settings,
            commands::storage_commands::set_documents_export_directory,
            commands::storage_commands::pick_documents_export_directory,
            commands::storage_commands::pick_documents_import_directory,
            commands::storage_commands::open_documents_export_directory,
            commands::storage_commands::import_session_documents,
            commands::storage_commands::wipe_all_data,
            commands::setup_commands::get_onboarding_state,
            commands::setup_commands::update_onboarding_state,
            commands::setup_commands::complete_onboarding,
            commands::platform_commands::get_runtime_platform,
            commands::setup_commands::run_setup_ai_test,
            commands::update_commands::check_for_app_update,
            commands::update_commands::install_app_update,
            stealth::window::focus_main_window,
            stealth::window::get_overlay_session_snapshot,
            stealth::window::overlay_request_guidance,
            stealth::window::overlay_analyze_image,
            stealth::window::list_capture_monitors,
            stealth::window::get_snapshot_monitor,
            stealth::window::set_snapshot_monitor,
            stealth::window::capture_screen_snapshot,
            stealth::window::toggle_overlay_capture_exclusion,
            stealth::window::set_overlay_system_audio_capture_active,
            commands::audio_capture_commands::claim_audio_capture,
            commands::audio_capture_commands::release_audio_capture,
            commands::audio_capture_commands::native_system_audio_supported,
            commands::audio_capture_commands::get_native_system_audio_status,
            commands::audio_capture_commands::start_native_system_audio,
            commands::audio_capture_commands::stop_native_system_audio,
            commands::audio_capture_commands::native_microphone_supported,
            commands::audio_capture_commands::list_microphones,
            commands::audio_capture_commands::get_preferred_microphone,
            commands::audio_capture_commands::set_preferred_microphone,
            commands::audio_capture_commands::start_microphone_test,
            commands::audio_capture_commands::stop_microphone_test,
            commands::audio_capture_commands::get_native_microphone_status,
            commands::audio_capture_commands::start_native_microphone,
            commands::audio_capture_commands::stop_native_microphone,
            commands::audio_capture_commands::set_native_microphone_muted,
            commands::audio_capture_commands::system_audio_bridge,
            commands::audio_capture_commands::microphone_bridge,
            commands::settings_commands::native_speech_supported,
            commands::settings_commands::get_macos_native_speech,
            commands::settings_commands::set_macos_native_speech,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
