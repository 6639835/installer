use fs2::available_space;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs, io,
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    time::Duration,
};
use tauri::{Manager, WebviewWindow};

#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("{0}")]
    Io(#[from] io::Error),
    #[error("{0}")]
    Tauri(#[from] tauri::Error),
    #[error("{0}")]
    Message(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type AppResult<T> = Result<T, AppError>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppPaths {
    app_data: String,
    local_app_data: String,
    home: String,
    temp: String,
    documents: String,
    resource_dir: String,
    platform: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirEntryInfo {
    name: String,
    path: String,
    is_file: bool,
    is_directory: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallResult {
    success: bool,
    error: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessageBoxOptions {
    title: String,
    message: String,
    buttons: Vec<String>,
}

fn path_to_string(path: PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

fn settings_path(app: &tauri::AppHandle) -> AppResult<PathBuf> {
    let dir = app.path().app_data_dir()?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("settings.json"))
}

#[tauri::command]
fn get_app_paths(app: tauri::AppHandle) -> AppResult<AppPaths> {
    let path = app.path();
    let app_data = path.app_data_dir()?;
    let home = path.home_dir()?;
    let temp = path.temp_dir()?;
    let documents = path
        .document_dir()
        .unwrap_or_else(|_| home.join("Documents"));
    let resource_dir = path
        .resource_dir()
        .unwrap_or_else(|_| app_data.join("resources"));

    let local_app_data = if cfg!(target_os = "windows") {
        directories::BaseDirs::new()
            .and_then(|dirs| dirs.data_local_dir().parent().map(Path::to_path_buf))
            .unwrap_or_else(|| app_data.clone())
    } else {
        app_data
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| app_data.clone())
    };

    Ok(AppPaths {
        app_data: path_to_string(app_data),
        local_app_data: path_to_string(local_app_data),
        home: path_to_string(home),
        temp: path_to_string(temp),
        documents: path_to_string(documents),
        resource_dir: path_to_string(resource_dir),
        platform: std::env::consts::OS.to_string(),
    })
}

#[tauri::command]
fn load_settings(app: tauri::AppHandle) -> AppResult<Value> {
    let path = settings_path(&app)?;
    if !path.exists() {
        return Ok(json!({}));
    }

    let content = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&content).unwrap_or_else(|_| json!({})))
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: Value) -> AppResult<()> {
    let path = settings_path(&app)?;
    fs::write(path, serde_json::to_string_pretty(&settings).unwrap())?;
    Ok(())
}

#[tauri::command]
fn fs_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn fs_read_text(path: String) -> AppResult<String> {
    Ok(fs::read_to_string(path)?)
}

#[tauri::command]
fn fs_write_text(path: String, content: String) -> AppResult<()> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, content)?;
    Ok(())
}

#[tauri::command]
fn fs_create_dir_all(path: String) -> AppResult<()> {
    fs::create_dir_all(path)?;
    Ok(())
}

#[tauri::command]
fn fs_remove(path: String, recursive: bool) -> AppResult<()> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(());
    }

    if path.is_dir() {
        if recursive {
            fs::remove_dir_all(path)?;
        } else {
            fs::remove_dir(path)?;
        }
    } else {
        fs::remove_file(path)?;
    }

    Ok(())
}

#[tauri::command]
fn fs_read_dir(path: String) -> AppResult<Vec<DirEntryInfo>> {
    let mut entries = Vec::new();
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        entries.push(DirEntryInfo {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: path_to_string(entry.path()),
            is_file: file_type.is_file(),
            is_directory: file_type.is_dir(),
        });
    }
    Ok(entries)
}

#[tauri::command]
fn fs_read_link(path: String) -> AppResult<Option<String>> {
    match fs::read_link(path) {
        Ok(link) => Ok(Some(path_to_string(link))),
        Err(error) if error.kind() == io::ErrorKind::InvalidInput => Ok(None),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

#[tauri::command]
fn free_disk_space(path: String) -> AppResult<u64> {
    Ok(available_space(path)?)
}

#[tauri::command]
fn tcp_port_open(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(750)).is_ok()
}

#[tauri::command]
fn open_path(path: String) -> AppResult<()> {
    opener::open(path).map_err(|error| AppError::Message(error.to_string()))
}

#[tauri::command]
fn open_url(url: String) -> AppResult<()> {
    opener::open(url).map_err(|error| AppError::Message(error.to_string()))
}

#[tauri::command]
fn select_directory(title: String, default_path: Option<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new().set_title(title);
    if let Some(default_path) = default_path {
        if !default_path.is_empty() {
            dialog = dialog.set_directory(default_path);
        }
    }
    dialog.pick_folder().map(path_to_string)
}

#[tauri::command]
fn show_message_box(options: MessageBoxOptions) -> usize {
    let result = rfd::MessageDialog::new()
        .set_title(options.title)
        .set_description(options.message)
        .set_buttons(rfd::MessageButtons::OkCancel)
        .show();

    if matches!(
        result,
        rfd::MessageDialogResult::Ok | rfd::MessageDialogResult::Yes
    ) {
        0
    } else {
        options.buttons.len().saturating_sub(1)
    }
}

#[tauri::command]
fn minimize_window(window: WebviewWindow) -> AppResult<()> {
    window.minimize()?;
    Ok(())
}

#[tauri::command]
fn toggle_maximize_window(window: WebviewWindow) -> AppResult<bool> {
    if window.is_maximized()? {
        window.unmaximize()?;
        Ok(false)
    } else {
        window.maximize()?;
        Ok(true)
    }
}

#[tauri::command]
fn close_window(window: WebviewWindow) -> AppResult<()> {
    window.close()?;
    Ok(())
}

#[tauri::command]
fn reload_window(window: WebviewWindow) -> AppResult<()> {
    window.eval("window.location.reload()")?;
    Ok(())
}

#[tauri::command]
fn is_window_maximized(window: WebviewWindow) -> AppResult<bool> {
    Ok(window.is_maximized()?)
}

#[tauri::command]
fn set_window_progress(_value: f64) -> AppResult<()> {
    Ok(())
}

#[tauri::command]
fn set_startup_at_login(_enabled: bool) -> AppResult<()> {
    Ok(())
}

#[tauri::command]
fn install_from_url(
    _install_id: u32,
    _url: String,
    _temp_dir: String,
    _dest_dir: String,
) -> InstallResult {
    InstallResult {
        success: false,
        error: Some(
            "The Rust Fragmenter installer backend has not been implemented yet.".to_string(),
        ),
    }
}

#[tauri::command]
fn cancel_install(_install_id: u32) -> AppResult<()> {
    Ok(())
}

#[tauri::command]
fn uninstall(community_package_dir: String, package_cache_dirs: Vec<String>) -> AppResult<bool> {
    let community_package_dir = Path::new(&community_package_dir);
    if community_package_dir.exists() {
        fs::remove_dir_all(community_package_dir)?;
    }

    for package_cache_dir in package_cache_dirs {
        let package_cache_dir = Path::new(&package_cache_dir);
        if !package_cache_dir.exists() {
            continue;
        }

        for entry in fs::read_dir(package_cache_dir)? {
            let entry = entry?;
            if entry.file_name() == "work" {
                continue;
            }
            let path = entry.path();
            if path.is_dir() {
                fs::remove_dir_all(path)?;
            } else {
                fs::remove_file(path)?;
            }
        }
    }

    Ok(true)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_app_paths,
            load_settings,
            save_settings,
            fs_exists,
            fs_read_text,
            fs_write_text,
            fs_create_dir_all,
            fs_remove,
            fs_read_dir,
            fs_read_link,
            free_disk_space,
            tcp_port_open,
            open_path,
            open_url,
            select_directory,
            show_message_box,
            minimize_window,
            toggle_maximize_window,
            close_window,
            reload_window,
            is_window_maximized,
            set_window_progress,
            set_startup_at_login,
            install_from_url,
            cancel_install,
            uninstall
        ])
        .run(tauri::generate_context!())
        .expect("error while running FlyByWire Installer");
}
