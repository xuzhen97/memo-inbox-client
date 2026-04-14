#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};
use serde::{Serialize, Deserialize};
use scraper::{Html, Selector};
use walkdir::WalkDir;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use tempfile::tempdir;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct FlomoImportItem {
    content: String,
    tags: Option<Vec<String>>,
    images: Option<Vec<String>>,
    external_id: Option<String>,
    created_at: Option<String>,
}

#[tauri::command]
async fn process_flomo_export(zip_path: String) -> Result<Vec<FlomoImportItem>, String> {
    let zip_file = fs::File::open(&zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;
    let mut archive = zip::ZipArchive::new(zip_file).map_err(|e| format!("Invalid zip format: {}", e))?;

    let tmp_dir = tempdir().map_err(|e| format!("Failed to create temp dir: {}", e))?;
    let extract_path = tmp_dir.path();

    // Extract everything
    archive.extract(extract_path).map_err(|e| format!("Failed to extract zip: {}", e))?;

    let mut import_items = Vec::new();

    // Find all HTML files
    for entry in WalkDir::new(extract_path).into_iter().filter_map(|e| e.ok()) {
        if entry.path().extension().map_or(false, |ext| ext == "html") {
            let html_content = fs::read_to_string(entry.path()).map_err(|e| format!("Failed to read HTML: {}", e))?;
            let document = Html::parse_document(&html_content);
            
            // Selector for flomo memo containers
            let memo_selector = Selector::parse("div.memo").unwrap();
            let content_selector = Selector::parse("div.content").unwrap();
            let time_selector = Selector::parse("div.time").unwrap();
            let img_selector = Selector::parse("img").unwrap();

            for memo in document.select(&memo_selector) {
                let mut content = String::new();
                if let Some(c) = memo.select(&content_selector).next() {
                    content = c.text().collect::<Vec<_>>().join(" ").trim().to_string();
                }

                if content.is_empty() {
                    continue;
                }

                let mut created_at = None;
                if let Some(t) = memo.select(&time_selector).next() {
                    created_at = Some(t.text().collect::<Vec<_>>().join(" ").trim().to_string());
                }

                // Extract tags from content (matches #tag)
                let mut tags = Vec::new();
                for word in content.split_whitespace() {
                    if word.starts_with('#') && word.len() > 1 {
                        tags.push(word[1..].to_string());
                    }
                }

                // Extract images
                let mut images = Vec::new();
                for img in memo.select(&img_selector) {
                    if let Some(src) = img.value().attr("src") {
                        // Resolve src relative to the HTML file's parent directory
                        let parent = entry.path().parent().unwrap_or(extract_path);
                        let img_path = parent.join(src);
                        
                        if img_path.exists() {
                            if let Ok(img_data) = fs::read(&img_path) {
                                let b64 = BASE64.encode(img_data);
                                // Determine mime type from extension
                                let mime = match img_path.extension().and_then(|e| e.to_str()) {
                                    Some("jpg") | Some("jpeg") => "image/jpeg",
                                    Some("png") => "image/png",
                                    Some("gif") => "image/gif",
                                    Some("webp") => "image/webp",
                                    _ => "application/octet-stream",
                                };
                                images.push(format!("data:{};base64,{}", mime, b64));
                            }
                        }
                    }
                }

                // Use timestamp + content hash as external_id to prevent duplicates
                let external_id = created_at.as_ref().map(|t| {
                    use std::collections::hash_map::DefaultHasher;
                    use std::hash::{Hash, Hasher};
                    let mut hasher = DefaultHasher::new();
                    t.hash(&mut hasher);
                    content.hash(&mut hasher);
                    format!("{:x}", hasher.finish())
                });

                import_items.push(FlomoImportItem {
                    content,
                    tags: if tags.is_empty() { None } else { Some(tags) },
                    images: if images.is_empty() { None } else { Some(images) },
                    external_id,
                    created_at,
                });
            }
        }
    }

    Ok(import_items)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![process_flomo_export])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
