use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillRoute {
    canonical: String,
    skill_path: Vec<String>,
    source_id: String,
}

impl SkillRoute {
    pub fn parse(value: &str) -> Result<Self, SkillRouteError> {
        let value = value.trim();

        if value.is_empty() {
            return Err(SkillRouteError::Empty);
        }

        if value.contains('?') || value.contains('#') {
            return Err(SkillRouteError::UnsupportedUriPart);
        }

        if let Some(path) = value.strip_prefix("agenticcrew://skills/") {
            return Self::from_path(path);
        }

        if let Some(path) = value.strip_prefix("skill://") {
            return Self::from_path(path);
        }

        Err(SkillRouteError::InvalidScheme)
    }

    pub fn canonical(&self) -> &str {
        &self.canonical
    }

    pub fn skill_path(&self) -> &[String] {
        &self.skill_path
    }

    pub fn source_id(&self) -> &str {
        &self.source_id
    }

    fn from_path(path: &str) -> Result<Self, SkillRouteError> {
        let segments = path
            .split('/')
            .map(validate_segment)
            .collect::<Result<Vec<_>, _>>()?;
        let (source_id, skill_path) = segments
            .split_first()
            .ok_or(SkillRouteError::MissingSourceId)?;

        if skill_path.is_empty() {
            return Err(SkillRouteError::MissingSkillPath);
        }

        let skill_path = skill_path.to_vec();
        let canonical = format!(
            "agenticcrew://skills/{}/{}",
            source_id,
            skill_path.join("/")
        );

        Ok(Self {
            canonical,
            skill_path,
            source_id: source_id.to_owned(),
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SkillRouteError {
    Empty,
    EmptySegment,
    InvalidScheme,
    InvalidSegment,
    MissingSkillPath,
    MissingSourceId,
    UnsupportedUriPart,
}

impl fmt::Display for SkillRouteError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SkillRouteError::Empty => write!(formatter, "skill route must not be empty"),
            SkillRouteError::EmptySegment => {
                write!(formatter, "skill route segments must not be empty")
            }
            SkillRouteError::InvalidScheme => {
                write!(
                    formatter,
                    "skill route must use agenticcrew://skills/ or skill://"
                )
            }
            SkillRouteError::InvalidSegment => {
                write!(
                    formatter,
                    "skill route segments must use lowercase letters, numbers, '-' or '_'"
                )
            }
            SkillRouteError::MissingSkillPath => {
                write!(formatter, "skill route must include a skill path")
            }
            SkillRouteError::MissingSourceId => {
                write!(formatter, "skill route must include a source id")
            }
            SkillRouteError::UnsupportedUriPart => {
                write!(
                    formatter,
                    "skill route must not include query strings or fragments"
                )
            }
        }
    }
}

impl std::error::Error for SkillRouteError {}

fn validate_segment(segment: &str) -> Result<String, SkillRouteError> {
    if segment.is_empty() {
        return Err(SkillRouteError::EmptySegment);
    }

    let is_valid = segment.chars().all(|character| {
        character.is_ascii_lowercase()
            || character.is_ascii_digit()
            || character == '-'
            || character == '_'
    });

    if !is_valid {
        return Err(SkillRouteError::InvalidSegment);
    }

    Ok(segment.to_owned())
}

#[cfg(test)]
mod tests {
    use super::{SkillRoute, SkillRouteError};

    #[test]
    fn parses_canonical_skill_route_with_namespace() {
        let route = SkillRoute::parse("agenticcrew://skills/superpowers/review/gh-fix-ci")
            .expect("route should parse");

        assert_eq!(route.source_id(), "superpowers");
        assert_eq!(route.skill_path(), &["review", "gh-fix-ci"]);
        assert_eq!(
            route.canonical(),
            "agenticcrew://skills/superpowers/review/gh-fix-ci"
        );
    }

    #[test]
    fn normalizes_short_skill_alias_to_canonical_route() {
        let route = SkillRoute::parse("skill://browser/browser").expect("alias should parse");

        assert_eq!(route.source_id(), "browser");
        assert_eq!(route.skill_path(), &["browser"]);
        assert_eq!(route.canonical(), "agenticcrew://skills/browser/browser");
    }

    #[test]
    fn rejects_routes_without_a_skill_path() {
        let error = SkillRoute::parse("agenticcrew://skills/superpowers")
            .expect_err("route should require a skill path");

        assert_eq!(error, SkillRouteError::MissingSkillPath);
    }

    #[test]
    fn rejects_malformed_skill_routes() {
        for value in [
            "",
            "https://github.com/org/repo",
            "agenticcrew://harnesses/local/base",
            "agenticcrew://skills//planning",
            "skill://Superpowers/planning",
            "skill://superpowers/../planning",
            "skill://superpowers/review\\planning",
            "skill://superpowers/review?mode=load",
            "skill://superpowers/review#details",
        ] {
            assert!(
                SkillRoute::parse(value).is_err(),
                "{value} should be rejected"
            );
        }
    }
}
