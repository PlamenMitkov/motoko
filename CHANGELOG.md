# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add set_count update method to allow setting the counter to a specific value
- Add frontend development server scripts (`npm run start`)
- Add LLM canister implementation with mock responses for local testing
- Add LLM prompt interface with frontend integration
- Add eco-trails chatbot with AI-powered recommendations using ICP LLM Canister
- Add complete trail database with search functionality (name, description, region, keywords, difficulty)
- Add custom JSON parsing for AI responses with coordinate extraction
- Add ICPChatService - modular JavaScript class for ICP canister communication
- Add TypeScript version of ICPChatService with full type definitions
- Add comprehensive ICP integration examples and documentation

### Changed

- Update dependencies to latest versions
- Switched the template to Motoko for writing the backend canister
- Rewrote the devcontainer setup
- Implemented mock LLM for local development and testing
- Rewrote the tests
- Rewrote the npm scripts
- Rewrote the e2e workflow
- Fix mops installation in CI workflow by using npx
- Migrate OpenAI GPT integration to ICP LLM Canister (Llama 3.1 8B)
- Replace REST API calls with direct ICP canister communication using @dfinity/agent

## [0.1.0] - 2025-04-24

### Added

- Basic canister structure with Rust
- Counter functionality with increment and get_count methods
- Greeting functionality
- PocketIC testing infrastructure
- Vitest test runner configuration
- GitHub CI workflow for automated end-to-end tests for all methods
- Project documentation
- Add custom instructions for github copilot
