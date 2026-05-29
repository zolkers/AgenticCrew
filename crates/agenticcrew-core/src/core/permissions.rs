use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionGate {
    pub approved: bool,
    pub policy: ApprovedPermissionPolicy,
}

impl PermissionGate {
    pub fn approve(&mut self, policy: ApprovedPermissionPolicy) {
        self.approved = true;
        self.policy = policy;
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedPermissionPolicy {
    pub file_system: Vec<FileSystemPermissionScope>,
    pub git: bool,
    pub docker: bool,
    pub network: Vec<NetworkPermissionScope>,
    pub commands: Vec<CommandPermissionScope>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSystemPermissionScope {
    pub path: String,
    pub writable: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkPermissionScope {
    pub host: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandPermissionScope {
    pub command: String,
}
