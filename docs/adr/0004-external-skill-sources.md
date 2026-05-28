# ADR 0004: External Skill Sources

Date: 2026-05-28

## Status

Accepted

## Context

AgenticCrew should support skills from external GitHub repositories, including
Superpowers-style repositories such as Obra's. External skills expand the product
surface, so they need explicit provenance and activation rules before any runtime
can use them.

## Decision

Rust owns skill source registration in durable state.

GitHub skill sources record the repository URL, selected ref, trust level,
validation status, last sync status, and activation state. Newly registered
external sources start as pending validation, never synced, and inactive. They
cannot bypass local permission gates.

## Consequences

- External skill sources must be pinned to an explicit ref before registration.
- Only GitHub repository URLs are accepted for the first external source version.
- UI and workers may display or request skill sources through Rust commands, but
  they do not activate or trust external skills independently.
- Future sync and validation work must preserve provenance, trust level, and the
  inactive-by-default rule.
- Activation is only allowed after Rust marks the source as validated.
