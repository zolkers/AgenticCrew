use std::{
    fmt, fs, io,
    path::{Path, PathBuf},
};

use super::{
    skill_routes::SkillRoute,
    skills::{DiscoveredSkillManifest, SkillManifestValidationError},
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SkillManifestInspection {
    pub discovered_skills: Vec<DiscoveredSkillManifest>,
    pub validation_errors: Vec<SkillManifestValidationError>,
}

#[derive(Debug)]
pub enum SkillManifestInspectionError {
    Io { path: PathBuf, source: io::Error },
}

impl fmt::Display for SkillManifestInspectionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SkillManifestInspectionError::Io { path, source } => {
                write!(
                    formatter,
                    "skill manifest inspection io error at {}: {source}",
                    path.display()
                )
            }
        }
    }
}

impl std::error::Error for SkillManifestInspectionError {}

pub fn inspect_skill_manifests(
    cache_path: impl AsRef<Path>,
    source_id: &str,
) -> Result<SkillManifestInspection, SkillManifestInspectionError> {
    let cache_path = cache_path.as_ref();
    let mut manifest_paths = Vec::new();
    collect_skill_manifest_paths(cache_path, &mut manifest_paths)?;
    manifest_paths.sort();

    let mut discovered_skills = Vec::new();
    let mut validation_errors = Vec::new();

    for manifest_path in manifest_paths {
        let relative_path = relative_path_string(cache_path, &manifest_path);
        let content = fs::read_to_string(&manifest_path).map_err(|source| {
            SkillManifestInspectionError::Io {
                path: manifest_path.clone(),
                source,
            }
        })?;

        match parse_skill_manifest(source_id, &relative_path, &content) {
            Ok(manifest) => discovered_skills.push(manifest),
            Err(error) => validation_errors.push(error),
        }
    }

    Ok(SkillManifestInspection {
        discovered_skills,
        validation_errors,
    })
}

fn collect_skill_manifest_paths(
    directory: &Path,
    manifest_paths: &mut Vec<PathBuf>,
) -> Result<(), SkillManifestInspectionError> {
    for entry in fs::read_dir(directory).map_err(|source| SkillManifestInspectionError::Io {
        path: directory.to_path_buf(),
        source,
    })? {
        let entry = entry.map_err(|source| SkillManifestInspectionError::Io {
            path: directory.to_path_buf(),
            source,
        })?;
        let path = entry.path();
        let file_type = entry
            .file_type()
            .map_err(|source| SkillManifestInspectionError::Io {
                path: path.clone(),
                source,
            })?;

        if file_type.is_dir() {
            collect_skill_manifest_paths(&path, manifest_paths)?;
        } else if file_type.is_file()
            && path.file_name().and_then(|name| name.to_str()) == Some("SKILL.md")
        {
            manifest_paths.push(path);
        }
    }

    Ok(())
}

fn parse_skill_manifest(
    source_id: &str,
    relative_path: &str,
    content: &str,
) -> Result<DiscoveredSkillManifest, SkillManifestValidationError> {
    let frontmatter = frontmatter_block(content).ok_or_else(|| SkillManifestValidationError {
        relative_path: relative_path.to_owned(),
        message: "missing required frontmatter block".to_owned(),
    })?;
    let name =
        frontmatter_field(&frontmatter, "name").ok_or_else(|| SkillManifestValidationError {
            relative_path: relative_path.to_owned(),
            message: "missing required frontmatter field 'name'".to_owned(),
        })?;
    let description = frontmatter_field(&frontmatter, "description").ok_or_else(|| {
        SkillManifestValidationError {
            relative_path: relative_path.to_owned(),
            message: "missing required frontmatter field 'description'".to_owned(),
        }
    })?;

    let id = format!("{source_id}/{name}");
    let route = SkillRoute::parse(&format!("skill://{id}"))
        .map_err(|error| SkillManifestValidationError {
            relative_path: relative_path.to_owned(),
            message: format!("invalid skill route: {error}"),
        })?
        .canonical()
        .to_owned();

    Ok(DiscoveredSkillManifest {
        id,
        route,
        name,
        description,
        relative_path: relative_path.to_owned(),
    })
}

fn frontmatter_block(content: &str) -> Option<String> {
    let mut lines = content.lines();
    if lines.next()? != "---" {
        return None;
    }

    let remainder = lines.collect::<Vec<_>>().join("\n");
    let end_index = remainder.find("\n---")?;

    Some(remainder[..end_index].to_owned())
}

fn frontmatter_field(frontmatter: &str, field_name: &str) -> Option<String> {
    let prefix = format!("{field_name}:");
    frontmatter.lines().find_map(|line| {
        let trimmed = line.trim();
        let value = trimmed.strip_prefix(&prefix)?.trim().trim_matches('"');

        if value.is_empty() {
            None
        } else {
            Some(value.to_owned())
        }
    })
}

fn relative_path_string(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .components()
        .map(|component| component.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/")
}

#[cfg(test)]
mod tests {
    use std::{
        env, fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::inspect_skill_manifests;

    #[test]
    fn inspect_skill_manifests_discovers_valid_skill_markdown() {
        let cache_path = test_path("inspect_skill_manifests_discovers_valid_skill_markdown");
        let skill_path = cache_path.join("skills/planning/SKILL.md");
        fs::create_dir_all(skill_path.parent().expect("skill parent")).expect("create skill dir");
        fs::write(
            &skill_path,
            "---\nname: planning\ndescription: Plan work safely\n---\n\nBody",
        )
        .expect("write skill manifest");

        let inspection =
            inspect_skill_manifests(&cache_path, "superpowers").expect("inspection should run");

        assert!(inspection.validation_errors.is_empty());
        assert_eq!(inspection.discovered_skills.len(), 1);
        assert_eq!(inspection.discovered_skills[0].id, "superpowers/planning");
        assert_eq!(
            inspection.discovered_skills[0].route,
            "agenticcrew://skills/superpowers/planning"
        );
        assert_eq!(inspection.discovered_skills[0].name, "planning");
        assert_eq!(
            inspection.discovered_skills[0].description,
            "Plan work safely"
        );
        assert_eq!(
            inspection.discovered_skills[0].relative_path,
            "skills/planning/SKILL.md"
        );
    }

    #[test]
    fn inspect_skill_manifests_reports_missing_required_frontmatter_fields() {
        let cache_path =
            test_path("inspect_skill_manifests_reports_missing_required_frontmatter_fields");
        let skill_path = cache_path.join("skills/bad/SKILL.md");
        fs::create_dir_all(skill_path.parent().expect("skill parent")).expect("create skill dir");
        fs::write(&skill_path, "---\nname: bad\n---\n\nBody").expect("write skill manifest");

        let inspection =
            inspect_skill_manifests(&cache_path, "superpowers").expect("inspection should run");

        assert!(inspection.discovered_skills.is_empty());
        assert_eq!(inspection.validation_errors.len(), 1);
        assert_eq!(
            inspection.validation_errors[0].relative_path,
            "skills/bad/SKILL.md"
        );
        assert_eq!(
            inspection.validation_errors[0].message,
            "missing required frontmatter field 'description'"
        );
    }

    fn test_path(test_name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();

        env::temp_dir().join(format!(
            "agenticcrew_skill_manifest_tests_{}_{}_{}",
            std::process::id(),
            test_name,
            unique
        ))
    }
}
