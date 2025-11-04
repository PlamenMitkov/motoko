# 🌿 Екопътеки България - Quick Start Guide

## What Is This?

A Bulgarian eco-trails tourist chatbot application running on the Internet Computer. Migrated from Python/Flask to Motoko for true decentralization.

## Features

- 🔍 Search eco-trails by keyword
- 🗺️ View trail details (difficulty, duration, coordinates)
- 💬 Chat interface for trail recommendations
- 🏔️ Sample trails from Витоша, Рила, and Родопи regions
- 📱 Modern React UI with Bulgarian language

## Quick Start

### 1. Deploy the Application

```bash
# Start local IC network
dfx start --background

# Deploy canisters
dfx deploy
```

### 2. Access the Application

After deployment, you'll see URLs like:

```
Backend canister via Candid interface:
  backend: http://127.0.0.1:4943/?canisterId=xxxxx

Frontend canister via browser:
  frontend: http://127.0.0.1:4943/?canisterId=yyyyy
```

Open the frontend URL in your browser.

### 3. Try These Queries

- "Витоша" - Find trails in Vitosha mountain
- "лесни маршрути" - Find easy trails
- "Рила" - Find trails in Rila
- "планина" - Search for mountain trails

## Application Structure

```
src/
├── backend/
│   └── main.mo              # Motoko canister with trail data & search
└── frontend/
    └── src/
        ├── App.tsx          # Main application
        ├── views/
        │   └── EcoTrailsView.tsx   # Chatbot UI
        └── services/
            └── backendService.ts    # API layer
```

## Sample Trails Included

1. **Витоша - Златни мостове** (София, средна, 8 км)
2. **Рилски манастир - Седемте езера** (Рила, средна, 12 км)
3. **Белинташ** (Родопи, лесна, 5 км)

## Development Commands

```bash
# Start IC network
dfx start --background

# Deploy backend only
dfx deploy backend

# Deploy frontend only
dfx deploy frontend

# Rebuild declarations
dfx generate

# Stop IC network
dfx stop
```

## Calling Backend Directly

### Via DFX

```bash
# Search for trails
dfx canister call backend searchTrails '("Витоша")'

# Get all trails
dfx canister call backend listAllTrails

# Query chatbot
dfx canister call backend queryData '("user123", "Покажи ми лесни маршрути")'
```

### Via Candid UI

Open the backend Candid URL and interact with functions visually.

## Testing the Frontend

1. Open the frontend URL in your browser
2. You'll see the trail list on the left
3. Click on a trail to view details
4. Type a message in the chat to search for trails
5. View responses with trail recommendations

## Migration from Python

This application was migrated from a Python Flask application. See `MIGRATION_SUMMARY.md` for detailed migration notes.

**Original Features**:

- Flask web server
- OpenAI GPT integration
- JSON data storage
- Session management

**New IC Features**:

- Motoko canister
- Stable storage
- React frontend
- Decentralized hosting

## File Reference

- `MIGRATION_SUMMARY.md` - Detailed migration documentation
- `src/python_ref/` - Original Python application for reference
- `src/backend/main.mo` - Motoko backend
- `src/frontend/src/views/EcoTrailsView.tsx` - Main UI component

## Troubleshooting

### "Cannot find module declarations/backend"

- Run `dfx deploy` to generate declarations
- Declarations are created during deployment

### "No trails found"

- Trails are initialized automatically on first deployment
- Check console for "Initialized X sample trails" message

### Frontend not loading

- Make sure both canisters are deployed
- Check browser console for errors
- Verify you're using the correct frontend URL

## Next Steps

1. ✅ Deploy locally and test
2. Add more Bulgarian trails to the database
3. Integrate with IC LLM canister for smarter responses
4. Add map visualization
5. Deploy to IC mainnet

## Support

For issues or questions:

- Check `MIGRATION_SUMMARY.md` for technical details
- Review Python reference in `src/python_ref/`
- Examine Motoko code in `src/backend/main.mo`

---

**Tech Stack**: Motoko + React + TypeScript + Tailwind CSS  
**Platform**: Internet Computer  
**Language**: Български (Bulgarian)
