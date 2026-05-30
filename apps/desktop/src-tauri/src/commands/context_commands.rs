use serde::Deserialize;

use serde::Serialize;

use tauri::State;



use crate::commands::session_dto::{build_live_state, LiveSessionStateDto};

use crate::commands::CommandResponse;

use crate::documents::attachment::{clear_session_attachments, pages_json, save_pre_meeting_pages};
use crate::documents::parse;

use crate::storage::app_settings::AssistantPreferences;

use crate::storage::AppState;



#[derive(Debug, Serialize)]

pub struct SessionContextDto {

    pub session_id: String,

    pub role: Option<String>,

    pub objective: Option<String>,

    pub audience: Option<String>,

    pub company_or_product_notes: Option<String>,

    pub system_prompt: Option<String>,

    pub assistant_preset_id: Option<String>,

    pub preferred_tone: Option<String>,

    pub forbidden_topics: Option<String>,

    pub pre_meeting_context: Option<String>,

    pub pre_meeting_context_source: Option<String>,

    pub pre_meeting_attachment_page_count: Option<i32>,

}



#[derive(Debug, Deserialize)]

pub struct UpdateSessionContextInput {

    pub role: Option<String>,

    pub objective: Option<String>,

    pub audience: Option<String>,

    pub company_or_product_notes: Option<String>,

    pub system_prompt: Option<String>,

    pub assistant_preset_id: Option<String>,

    pub preferred_tone: Option<String>,

    pub forbidden_topics: Option<String>,

    pub pre_meeting_context: Option<String>,

    pub pre_meeting_context_source: Option<String>,

    /// When set, replaces stored visual pages (`Some(vec![])` clears). Each entry is a data URL or base64 image.
    pub pre_meeting_attachment_pages_base64: Option<Vec<String>>,

}



#[derive(Debug, Deserialize)]

pub struct ParseMeetingDocumentInput {

    pub filename: String,

    pub text: Option<String>,

    pub content_base64: Option<String>,

}



#[derive(Debug, Serialize)]

pub struct ParseMeetingDocumentResult {

    pub text: String,

    pub source_label: String,

    /// `text`, `image`, or `pdf`
    pub attachment_kind: String,

}



fn trim_opt(value: Option<String>) -> Option<String> {

    value.and_then(|v| {

        let t = v.trim();

        if t.is_empty() {

            None

        } else {

            Some(t.to_string())

        }

    })

}



fn preferences_from_input(input: &UpdateSessionContextInput) -> AssistantPreferences {

    AssistantPreferences {

        assistant_preset_id: trim_opt(input.assistant_preset_id.clone()),

        system_prompt: trim_opt(input.system_prompt.clone()),

        role: trim_opt(input.role.clone()),

        objective: trim_opt(input.objective.clone()),

        audience: trim_opt(input.audience.clone()),

        company_or_product_notes: trim_opt(input.company_or_product_notes.clone()),

        preferred_tone: trim_opt(input.preferred_tone.clone()),

        forbidden_topics: trim_opt(input.forbidden_topics.clone()),

    }

}



pub(crate) fn context_dto(ctx: local_store::models::SessionContext) -> SessionContextDto {

    SessionContextDto {

        session_id: ctx.session_id,

        role: ctx.role,

        objective: ctx.objective,

        audience: ctx.audience,

        company_or_product_notes: ctx.company_or_product_notes,

        system_prompt: ctx.custom_prompts,

        assistant_preset_id: ctx.assistant_preset_id,

        preferred_tone: ctx.preferred_tone,

        forbidden_topics: ctx.forbidden_topics,

        pre_meeting_context: ctx.pre_meeting_context,

        pre_meeting_context_source: ctx.pre_meeting_context_source,

        pre_meeting_attachment_page_count: ctx
            .pre_meeting_attachment_pages
            .as_ref()
            .and_then(|json| serde_json::from_str::<Vec<String>>(json).ok())
            .map(|pages| pages.len() as i32),

    }

}



#[tauri::command]

pub fn get_assistant_preferences(

    state: State<'_, AppState>,

) -> Result<CommandResponse<SessionContextDto>, ()> {

    match state.app_settings.get() {

        Ok(settings) => {

            let prefs = &settings.assistant;

            Ok(CommandResponse::success(SessionContextDto {

                session_id: String::new(),

                role: prefs.role.clone(),

                objective: prefs.objective.clone(),

                audience: prefs.audience.clone(),

                company_or_product_notes: prefs.company_or_product_notes.clone(),

                system_prompt: prefs.system_prompt.clone(),

                assistant_preset_id: prefs.assistant_preset_id.clone(),

                preferred_tone: prefs.preferred_tone.clone(),

                forbidden_topics: prefs.forbidden_topics.clone(),

                pre_meeting_context: None,

                pre_meeting_context_source: None,

                pre_meeting_attachment_page_count: None,

            }))

        }

        Err(e) => Ok(CommandResponse::failure("settings_error", e)),

    }

}



#[tauri::command]

pub fn save_assistant_preferences(

    state: State<'_, AppState>,

    input: UpdateSessionContextInput,

) -> Result<CommandResponse<SessionContextDto>, ()> {

    let prefs = preferences_from_input(&input);

    match state.app_settings.update(|s| {

        s.assistant = prefs.clone();

    }) {

        Ok(_) => Ok(CommandResponse::success(SessionContextDto {

            session_id: String::new(),

            role: prefs.role,

            objective: prefs.objective,

            audience: prefs.audience,

            company_or_product_notes: prefs.company_or_product_notes,

            system_prompt: prefs.system_prompt,

            assistant_preset_id: prefs.assistant_preset_id,

            preferred_tone: prefs.preferred_tone,

            forbidden_topics: prefs.forbidden_topics,

            pre_meeting_context: trim_opt(input.pre_meeting_context),

            pre_meeting_context_source: trim_opt(input.pre_meeting_context_source),

            pre_meeting_attachment_page_count: None,

        })),

        Err(e) => Ok(CommandResponse::failure("settings_error", e)),

    }

}



#[tauri::command]

pub fn get_session_context(

    state: State<'_, AppState>,

    session_id: String,

) -> Result<CommandResponse<SessionContextDto>, ()> {

    match state.with_repo(|repo| repo.get_session_context(&session_id).map(context_dto)) {

        Ok(dto) => Ok(CommandResponse::success(dto)),

        Err(e) => Ok(CommandResponse::failure("context_error", e)),

    }

}



#[tauri::command]

pub fn update_session_context(

    state: State<'_, AppState>,

    session_id: String,

    input: UpdateSessionContextInput,

) -> Result<CommandResponse<LiveSessionStateDto>, ()> {

    let prefs = preferences_from_input(&input);

    if let Err(e) = state.app_settings.update(|s| {

        s.assistant = prefs;

    }) {

        return Ok(CommandResponse::failure("settings_error", e));

    }



    let pages_json = match input.pre_meeting_attachment_pages_base64 {
        None => None,
        Some(pages) if pages.is_empty() => {
            clear_session_attachments(&state.data_dir, &session_id);
            None
        }
        Some(pages) => match save_pre_meeting_pages(&state.data_dir, &session_id, &pages) {
            Ok(stored) => pages_json(&stored),
            Err(e) => return Ok(CommandResponse::failure("context_error", e)),
        },
    };

    match state.with_repo(|repo| {

        repo.update_session_context(

            &session_id,

            input.role.as_deref(),

            input.objective.as_deref(),

            input.audience.as_deref(),

            input.company_or_product_notes.as_deref(),

            input.system_prompt.as_deref(),

            input.assistant_preset_id.as_deref(),

            input.preferred_tone.as_deref(),

            input.forbidden_topics.as_deref(),

            input.pre_meeting_context.as_deref(),

            input.pre_meeting_context_source.as_deref(),

            pages_json.as_deref(),

        )

        .map(|_| ())

    }) {

        Ok(()) => match build_live_state(&state, &session_id) {

            Ok(dto) => Ok(CommandResponse::success(dto)),

            Err(e) => Ok(CommandResponse::failure("state_error", e)),

        },

        Err(e) => Ok(CommandResponse::failure("context_error", e)),

    }

}



#[tauri::command]

pub fn parse_meeting_document(

    input: ParseMeetingDocumentInput,

) -> Result<CommandResponse<ParseMeetingDocumentResult>, ()> {

    match parse::parse_meeting_document(

        &input.filename,

        input.text.as_deref(),

        input.content_base64.as_deref(),

    ) {

        Ok((text, source_label, attachment_kind)) => Ok(CommandResponse::success(ParseMeetingDocumentResult {

            text,

            source_label,

            attachment_kind,

        })),

        Err(e) => Ok(CommandResponse::failure("parse_error", e)),

    }

}

