use std::{
    fmt, fs, io,
    path::{Path, PathBuf},
    process::Command,
};

use super::skills::{SkillSource, SkillSourceKind};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SkillSourceSyncOutcome {
    pub source_id: String,
    pub cache_path: PathBuf,
    pub commit: String,
}

#[derive(Debug)]
pub enum SkillSourceSyncError {
    Io { path: PathBuf, source: io::Error },
    UnsupportedSourceKind { source_id: String },
    Git { command: String, stderr: String },
}

impl fmt::Display for SkillSourceSyncError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SkillSourceSyncError::Io { path, source } => {
                write!(
                    formatter,
                    "skill source sync io error at {}: {source}",
                    path.display()
                )
            }
            SkillSourceSyncError::UnsupportedSourceKind { source_id } => {
                write!(
                    formatter,
                    "skill source '{source_id}' is not a GitHub source"
                )
            }
            SkillSourceSyncError::Git { command, stderr } => {
                write!(
                    formatter,
                    "skill source sync git command failed: {command}: {stderr}"
                )
            }
        }
    }
}

impl std::error::Error for SkillSourceSyncError {}

pub fn sync_github_skill_source_to_cache(
    source: &SkillSource,
    cache_root: impl AsRef<Path>,
) -> Result<SkillSourceSyncOutcome, SkillSourceSyncError> {
    if source.kind != SkillSourceKind::GitHub {
        return Err(SkillSourceSyncError::UnsupportedSourceKind {
            source_id: source.id.clone(),
        });
    }

    let cache_root = cache_root.as_ref();
    let final_path = skill_source_cache_path(cache_root, &source.id);
    let temp_path = cache_root.join(format!(".{}.tmp", sanitize_cache_segment(&source.id)));

    fs::create_dir_all(cache_root).map_err(|source| SkillSourceSyncError::Io {
        path: cache_root.to_path_buf(),
        source,
    })?;

    remove_dir_if_exists(&temp_path)?;
    fs::create_dir_all(&temp_path).map_err(|source| SkillSourceSyncError::Io {
        path: temp_path.clone(),
        source,
    })?;

    run_git(&["init"], &temp_path)?;
    run_git(
        &["remote", "add", "origin", &source.repository_url],
        &temp_path,
    )?;
    run_git(
        &["fetch", "--depth", "1", "origin", &source.selected_ref],
        &temp_path,
    )?;
    run_git(&["checkout", "--detach", "FETCH_HEAD"], &temp_path)?;
    let commit = run_git_capture(&["rev-parse", "HEAD"], &temp_path)?;

    remove_dir_if_exists(&final_path)?;
    fs::rename(&temp_path, &final_path).map_err(|source| SkillSourceSyncError::Io {
        path: final_path.clone(),
        source,
    })?;

    Ok(SkillSourceSyncOutcome {
        source_id: source.id.clone(),
        cache_path: final_path,
        commit,
    })
}

pub fn skill_source_cache_path(cache_root: impl AsRef<Path>, source_id: &str) -> PathBuf {
    cache_root.as_ref().join(sanitize_cache_segment(source_id))
}

fn sanitize_cache_segment(source_id: &str) -> String {
    source_id
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .collect()
}

fn remove_dir_if_exists(path: &Path) -> Result<(), SkillSourceSyncError> {
    if path.exists() {
        fs::remove_dir_all(path).map_err(|source| SkillSourceSyncError::Io {
            path: path.to_path_buf(),
            source,
        })?;
    }

    Ok(())
}

fn run_git(args: &[&str], cwd: &Path) -> Result<(), SkillSourceSyncError> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|source| SkillSourceSyncError::Io {
            path: cwd.to_path_buf(),
            source,
        })?;

    if output.status.success() {
        return Ok(());
    }

    Err(SkillSourceSyncError::Git {
        command: format_git_command(args),
        stderr: String::from_utf8_lossy(&output.stderr).trim().to_owned(),
    })
}

fn run_git_capture(args: &[&str], cwd: &Path) -> Result<String, SkillSourceSyncError> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|source| SkillSourceSyncError::Io {
            path: cwd.to_path_buf(),
            source,
        })?;

    if output.status.success() {
        return Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned());
    }

    Err(SkillSourceSyncError::Git {
        command: format_git_command(args),
        stderr: String::from_utf8_lossy(&output.stderr).trim().to_owned(),
    })
}

fn format_git_command(args: &[&str]) -> String {
    format!("git {}", args.join(" "))
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::skill_source_cache_path;

    #[test]
    fn skill_source_cache_path_sanitizes_source_id_as_single_directory_segment() {
        assert_eq!(
            skill_source_cache_path(Path::new("cache"), "../superpowers"),
            Path::new("cache").join("___superpowers")
        );
    }
}
