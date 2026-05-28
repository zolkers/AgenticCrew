fn main() {
    build_desktop_shell();
}

#[cfg(feature = "desktop-shell")]
fn build_desktop_shell() {
    tauri_build::build()
}

#[cfg(not(feature = "desktop-shell"))]
fn build_desktop_shell() {}
