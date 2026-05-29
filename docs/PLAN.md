# PLAN — AgentOS
> Application desktop multi-agents hiérarchique, ultra-configurable, cloud-ready
> Version 0.1 — Mai 2026

---

## 0. Vision & Positionnement

**Ce que c'est :** Une application desktop locale qui permet de créer, configurer et orchestrer des équipes d'agents IA hiérarchiques (comme une entreprise), avec un terminal visuel interactif par agent, un monitoring en temps réel, et une architecture pensée dès le départ pour migrer vers le cloud.

**Ce que ce n'est pas :** Un n8n, un CrewAI UI, un AutoGen Studio. Ces outils sont soit code-first sans UI propre, soit limités à des pipelines linéaires, soit sans terminal par agent, soit non-portables vers le cloud.

**Le gap réel comblé :**
- Aucun outil n'offre : hiérarchie configurable + terminal par agent + monitoring live + checkpoint/resume + human-in-the-loop + portabilité cloud
- Les 3 causes d'échec documentées (rôles ambigus 42%, désync agents 37%, pas de validation 21%) sont adressées by design dans l'architecture

---

## 1. Stack Technique

### Choix retenus (best-in-class pour clean + modulaire + cloud-ready)

| Couche | Technologie | Pourquoi |
|--------|-------------|----------|
| Desktop shell | **Tauri v2** (Rust) | Plus léger qu'Electron (−80% RAM), sécurité Rust, webview native, prêt pour distribuer |
| Frontend | **React 19 + TypeScript** | Écosystème mature, composants réutilisables, prêt pour web si cloud |
| UI Framework | **Tailwind CSS + shadcn/ui** | Design system propre, pas d'overhead |
| State management | **Zustand + Immer** | Simple, performant, pas de boilerplate Redux |
| Terminal agents | **xterm.js** | Terminal web professionnel, utilisé par VS Code |
| Backend orchestration | **Python 3.12 + FastAPI** | Meilleur écosystème IA (LangChain, LlamaIndex, tous les SDKs), async natif |
| Agent engine | **LangGraph (core)** | Graphe d'états, checkpoint natif, le plus robuste en prod |
| Communication desktop↔backend | **WebSocket + REST** | Streaming token par token + appels ponctuels |
| Base de données | **SQLite (local) → PostgreSQL (cloud)** | SQLAlchemy comme ORM = migration sans réécriture |
| Mémoire vectorielle | **ChromaDB (local) → Qdrant (cloud)** | API identique, swap transparent |
| Queue de tâches | **Celery + Redis (local via docker)** | Prêt pour scale horizontal en cloud |
| Packaging | **Tauri Updater + GitHub Releases** | Auto-update de l'app desktop |

### Architecture de communication

```
┌─────────────────────────────────────┐
│  Tauri Shell (Rust)                 │
│  ┌───────────────────────────────┐  │
│  │  React Frontend (TypeScript)  │  │
│  │  - UI/UX                      │  │
│  │  - xterm.js par agent         │  │
│  │  - Zustand state              │  │
│  └──────────┬────────────────────┘  │
│             │ WebSocket + REST       │
└─────────────┼───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  FastAPI Backend (Python)           │
│  - Agent Orchestrator (LangGraph)   │
│  - Provider Router (OpenAI/Anthropic│
│    /Mistral/Ollama)                 │
│  - Memory Manager                   │
│  - Tool Registry                    │
│  - Checkpoint Engine                │
│  - Cost Tracker                     │
└─────────────────────────────────────┘
```

---

## 2. Architecture des Agents

### Modèle hiérarchique (structure d'entreprise)

```
CEO Agent (Director)
├── Manager Agent A
│   ├── Worker Agent A1
│   ├── Worker Agent A2
│   └── Worker Agent A3
├── Manager Agent B
│   ├── Worker Agent B1
│   └── Worker Agent B2
└── Critic Agent (transversal — valide les outputs)
```

Chaque agent possède :
- Un **rôle** (system prompt configurable)
- Un **modèle IA** assigné (peut être différent par agent)
- Des **tools** activés (liste configurable)
- Une **mémoire** (courte + longue, partagée ou isolée)
- Un **terminal visuel** interactif
- Un **score de fiabilité** calculé en live
- Des **limites** (max tokens, max steps, timeout)

### Types d'agents built-in (bibliothèque de presets)

| Preset | Rôle | Tools par défaut |
|--------|------|-----------------|
| CEO | Décompose la tâche, délègue, agrège | Tous |
| Researcher | Recherche et synthèse | Web search, file read |
| Coder | Génère et exécute du code | Code sandbox, file write |
| Critic | Valide et critique les outputs | File read |
| Planner | Crée des plans step-by-step | — |
| Writer | Rédige des contenus | File write |
| DataAnalyst | Analyse données et fichiers | File read, code sandbox |
| Custom | Défini entièrement par l'utilisateur | Configurable |

---

## 3. Fonctionnalités Core

### 3.1 Gestion des équipes & agents
- Créer/éditer/supprimer des agents avec nom, rôle, modèle, tools, mémoire
- Organiser en équipes hiérarchiques (drag & drop dans l'UI)
- Import/export de configurations en YAML
- Bibliothèque de presets d'agents et d'équipes
- Workspace isolation : chaque équipe a ses propres fichiers, mémoire, contexte

### 3.2 Terminal visuel par agent
- Un terminal xterm.js dédié par agent
- Streaming token par token en temps réel
- Interaction directe : envoyer un message à n'importe quel agent
- Mode broadcast : injecter un contexte à toute l'équipe
- Historique complet scrollable par agent
- Distinction visuelle : outputs agent / tool calls / erreurs / human messages

### 3.3 Exécution & Orchestration
- Lancement d'une tâche via le CEO agent (qui délègue)
- Pause / Resume d'un run en cours
- Kill d'un agent spécifique (les autres continuent)
- Redirect : renvoyer la tâche d'un agent vers un autre
- Exécution parallèle des agents non-dépendants
- Human-in-the-loop gates : points de validation humaine configurables

### 3.4 Checkpoint & Resume (critique)
- Sauvegarde automatique de l'état à chaque étape de chaque agent
- Si un agent plante à l'étape 7/10 → reprise à 7, pas à 0
- Historique des runs avec possibilité de replay
- Export d'un run pour debug

### 3.5 Mémoire
- **Mémoire courte** : contexte de la session en cours (sliding window configurable)
- **Mémoire longue** : base vectorielle ChromaDB, persistante entre sessions
- **Mémoire partagée** : accessible par tous les agents d'une équipe
- **Mémoire individuelle** : propre à un agent
- Interface de visualisation et nettoyage de la mémoire

### 3.6 Tools Registry
- **Web Search** (SerpAPI / Brave Search)
- **File System** (lecture/écriture dans un dossier workspace)
- **Code Sandbox** (exécution Python/JS isolée via subprocess)
- **REST API caller** (appels HTTP configurables)
- **Database** (requêtes SQL sur SQLite local)
- **Plugin system** : ajouter un tool custom en Python en 10 lignes

### 3.7 Provider Router (multi-modèles)
- OpenAI (GPT-4o, o3, etc.)
- Anthropic (Claude Sonnet, Opus)
- Mistral
- Ollama (modèles locaux)
- **Graceful degradation** : fallback automatique si un provider est down
- Provider configurable par agent (ex: CEO → Claude Opus, Workers → GPT-4o-mini)

---

## 4. Monitoring & Observabilité

### Dashboard live
- Vue d'ensemble de tous les agents actifs (statut, étape, modèle)
- Timeline interactive des tâches (qui a fait quoi, dans quel ordre)
- Token usage par agent en temps réel
- **Cost tracker** : coût estimé en $ par agent et par run total
- Score de fiabilité par agent (% de succès sur les derniers runs)
- Alertes configurables (budget dépassé, agent bloqué, erreur critique)

### Audit trail
- Chaque décision de chaque agent est loguée avec timestamp
- Chaque tool call est enregistré (input + output)
- Export JSON/CSV de l'audit trail complet
- Recherche full-text dans les logs

### Agent Evals intégrés
- Score qualité de l'output (via un Critic agent dédié)
- Comparaison de runs (même tâche, configurations différentes)
- Détection de doublons de travail entre agents (agents qui font la même chose)

---

## 5. Interface Utilisateur

### Layout principal
- **Sidebar gauche** : liste des équipes et agents, navigation
- **Zone centrale** : vue principale (terminals, dashboard, éditeur)
- **Panneau droit** : config de l'agent sélectionné, métriques
- Layout flexible et redimensionnable (comme un IDE)
- Thème dark/light

### Vues principales
1. **Team View** : tous les terminaux agents d'une équipe visibles simultanément
2. **Focus View** : un agent en plein écran avec son terminal
3. **Dashboard View** : monitoring et métriques en temps réel
4. **Config View** : éditeur d'équipes et d'agents (+ import/export YAML)
5. **Memory View** : visualisation et gestion de la mémoire
6. **Logs View** : audit trail complet avec recherche

### UX principles
- Tout doit être accessible en 2 clics maximum
- Aucun jargon technique exposé à l'utilisateur (sauf mode avancé)
- Chaque action critique demande confirmation
- Raccourcis clavier pour les power users
- Onboarding guidé pour la première utilisation

---

## 6. Configuration & Customisation

### Niveaux de configuration
1. **Global** : providers, API keys, thème, langue, shortcuts
2. **Workspace** : équipes, agents, memory settings, tool permissions
3. **Agent** : rôle, modèle, system prompt, tools, memory, limites
4. **Run** : paramètres d'exécution, human-in-the-loop gates, budget max

### Format de configuration (YAML)
```yaml
# Exemple d'équipe configurable
team:
  name: "Research Team"
  workspace: "./workspaces/research"
  
  agents:
    - id: ceo
      name: "Director"
      preset: CEO
      model: claude-opus-4
      memory:
        short_term: 20000  # tokens
        long_term: true
        shared: true
      
    - id: researcher_1
      name: "Web Researcher"
      preset: Researcher
      model: gpt-4o-mini
      tools: [web_search, file_write]
      reports_to: ceo
      
    - id: critic
      name: "Quality Critic"
      preset: Critic
      model: claude-sonnet-4
      tools: [file_read]
      role: transversal
      
  human_gates:
    - after: researcher_1
      condition: "always"  # ou "on_low_confidence"
      
  budget:
    max_cost_usd: 2.00
    alert_at: 1.50
```

---

## 7. Ce qui différencie AgentOS (features absentes partout ailleurs)

| Feature | AgentOS | CrewAI | AutoGen | n8n |
|---------|---------|--------|---------|-----|
| Terminal visuel par agent | ✅ | ❌ | ❌ | ❌ |
| Checkpoint & Resume | ✅ | Partiel | ❌ | ❌ |
| Interaction directe avec un agent | ✅ | ❌ | ❌ | ❌ |
| Cost tracker live par agent | ✅ | ❌ | ❌ | ❌ |
| Graceful degradation provider | ✅ | ❌ | ❌ | ❌ |
| Human-in-the-loop gates | ✅ | Partiel | Partiel | ❌ |
| Agent reliability score | ✅ | ❌ | ❌ | ❌ |
| Export YAML + import | ✅ | Partiel | ❌ | ✅ |
| Desktop app propre | ✅ | ❌ | ❌ | ✅ |
| Cloud-ready by design | ✅ | ✅ | ✅ | ✅ |
| Plugin tools en 10 lignes | ✅ | Partiel | ❌ | ✅ |

---

## 8. Architecture Cloud-Ready (migration future)

L'app locale est conçue pour que la migration cloud soit un **swap de providers**, pas une réécriture.

| Local | Cloud |
|-------|-------|
| SQLite | PostgreSQL (même SQLAlchemy ORM) |
| ChromaDB | Qdrant Cloud (même API) |
| Redis local (docker) | Redis Cloud / Upstash |
| FastAPI local | FastAPI sur Railway / Fly.io / AWS |
| Tauri desktop | Next.js (même React frontend) |
| Fichiers locaux | S3 / R2 |

La seule chose à changer : les variables d'environnement et les adaptateurs de storage.

---

## 9. Structure du Projet (Monorepo)

```
agentos/
├── apps/
│   ├── desktop/                 # Tauri app
│   │   ├── src-tauri/          # Rust shell
│   │   └── src/                # React frontend
│   │       ├── components/
│   │       │   ├── AgentTerminal/
│   │       │   ├── TeamConfig/
│   │       │   ├── Dashboard/
│   │       │   ├── MemoryView/
│   │       │   └── LogsView/
│   │       ├── stores/          # Zustand stores
│   │       ├── hooks/
│   │       └── views/
│   └── web/                     # (futur) Next.js cloud
│
├── packages/
│   ├── agent-engine/            # Python - orchestration LangGraph
│   │   ├── agents/
│   │   │   ├── base.py
│   │   │   ├── presets/
│   │   │   └── hierarchy.py
│   │   ├── memory/
│   │   │   ├── short_term.py
│   │   │   ├── long_term.py
│   │   │   └── shared.py
│   │   ├── tools/
│   │   │   ├── registry.py
│   │   │   ├── web_search.py
│   │   │   ├── code_sandbox.py
│   │   │   ├── file_system.py
│   │   │   └── plugin_loader.py
│   │   ├── providers/
│   │   │   ├── router.py        # Graceful degradation ici
│   │   │   ├── openai.py
│   │   │   ├── anthropic.py
│   │   │   ├── mistral.py
│   │   │   └── ollama.py
│   │   ├── checkpoint/
│   │   │   └── engine.py
│   │   └── monitoring/
│   │       ├── cost_tracker.py
│   │       ├── audit_trail.py
│   │       └── evals.py
│   │
│   ├── api/                     # FastAPI - interface REST/WS
│   │   ├── routers/
│   │   ├── websocket/
│   │   └── schemas/
│   │
│   └── shared/                  # Types TypeScript partagés
│       └── types/
│
├── configs/                     # YAML templates d'équipes
├── workspaces/                  # Fichiers des agents par workspace
├── docker-compose.yml           # Redis + ChromaDB local
└── pyproject.toml
```

---

## 10. Roadmap de Développement

### Phase 1 — Foundation (semaines 1-4)
- [ ] Setup monorepo Tauri + React + FastAPI
- [ ] Agent engine de base (un seul agent fonctionnel)
- [ ] Provider router (OpenAI + Anthropic)
- [ ] Terminal xterm.js dans l'UI
- [ ] WebSocket streaming token par token
- [ ] Config YAML de base

### Phase 2 — Multi-agents (semaines 5-8)
- [ ] Hiérarchie CEO → Managers → Workers
- [ ] Mémoire courte et longue
- [ ] Tool registry (web search, file system, code sandbox)
- [ ] Checkpoint & Resume
- [ ] Pause / Kill / Redirect d'un agent

### Phase 3 — UX & Monitoring (semaines 9-12)
- [ ] Dashboard live (tokens, coût, statut)
- [ ] Cost tracker par agent
- [ ] Audit trail complet
- [ ] Human-in-the-loop gates
- [ ] Import/export YAML

### Phase 4 — Polish & Extras (semaines 13-16)
- [ ] Agent reliability scores
- [ ] Graceful degradation providers
- [ ] Plugin system pour tools custom
- [ ] Bibliothèque de presets
- [ ] Onboarding guidé
- [ ] Packaging Tauri (installateur)

### Phase 5 — Cloud (futur)
- [ ] Migration SQLite → PostgreSQL
- [ ] Migration ChromaDB → Qdrant Cloud
- [ ] Frontend web (Next.js)
- [ ] Auth utilisateurs
- [ ] Multi-workspace cloud

---

## 10.1 Etat actuel et reste a faire

### Deja pose dans l'application
- [x] Preview desktop moderne avec launchpad multi-workspace, cockpit, Mission Control, Skill Sources, Settings, Harness Studio, Agent Studio et Git.
- [x] Creation de workspace cote UI avec branche, chemin, budget, agents seedes et ouverture directe du cockpit.
- [x] Configuration OpenAI initiale avec cle API redactee, synchronisation des modeles et terrain prepare pour d'autres providers.
- [x] Agent Studio avec creation/edition/activation d'agents custom, liaison skills/harness/modeles, runs d'entrainement, ledger de versions et promotion d'un run termine.
- [x] Harness Studio avec profils multiples, edition, activation et apercu effectif.
- [x] Skill Sources avec registre, routes de skills et statut de source.
- [x] Git Panel avec contexte workspace, branche/path editables et refresh de statut.
- [x] Run profile dans le cockpit pour exposer la selection courante workspace + agent + harness + branche avant execution.
- [x] Bridge de commandes Electron/Tauri/preview et harness Docker pour tester l'app sans prerequis Rust/MSVC sur Windows.

### Manque avant une app vraiment utilisable
- [ ] Finaliser la migration Electron : packaging, preload durci, menus natifs, auto-update et retrait ou isolement propre des contrats Tauri encore presents.
- [ ] Brancher un backend reel FastAPI/LangGraph/WebSocket : le cockpit affiche encore beaucoup de donnees preview, pas des runs vivants.
- [ ] Implementer le moteur d'execution : start, pause, resume, kill, retry, redirect, checkpoint, replay et streaming terminal xterm.js par agent.
- [ ] Connecter le bouton Run profile a une vraie commande de lancement avec binding workspace + agent + harness + branche + provider.
- [ ] Completer la pipeline d'agents custom : datasets, entrainement/evals, critic review, import/export, version diff et chargement d'agents reutilisables.
- [ ] Rendre les harness totalement modulaires : plusieurs harness actifs, precedence globale/workspace/agent/skill/run, import/export, templates et loader d'extension PI.
- [ ] Etendre le provider router : OpenAI seulement pour l'instant, prevoir Anthropic, Gemini, Mistral, Ollama et fallback automatique.
- [ ] Transformer Skill Sources en marketplace : recherche, installation, validation, updates, provenance, routes stables et packages prives.
- [ ] Completer l'espace Git : checkout, creation de branche, pull, push, commit, PR, resolution de conflits et selection manuelle de branche comme dans Codex.
- [ ] Ajouter le systeme de plugins/tools custom Python : discovery locale, schema de config, secrets, permissions et sandbox.
- [ ] Remplacer les metriques fake par de vraies valeurs : sessions actives, agents actifs, couts, cache hit, fiabilite, progression et audit trail.
- [ ] Construire la memoire : court terme, long terme vectorielle, nettoyage, visualisation, partage workspace/agent.
- [ ] Ajouter l'onboarding et les settings globaux : workspace par defaut, provider, API key, theme, raccourcis, chemins et politique de securite.
- [ ] Continuer le polish UI : adoption plus nette du framework, moins de texte, plus d'icones, hierarchie header/sidebar plus calme, responsive complet.
- [ ] Preparer le mode cloud : auth, stockage distant, remote executors, collaboration et migration SQLite/PostgreSQL.

---

## 11. Décisions d'Architecture à ne pas changer

Ces choix sont structurants — les changer en cours de route coûte cher :

1. **LangGraph comme engine** (pas LangChain simple) — le checkpoint natif est essentiel
2. **SQLAlchemy comme ORM** — permet le swap SQLite → PostgreSQL sans réécriture
3. **WebSocket pour le streaming** — le polling REST ne peut pas streamer token par token
4. **Un process FastAPI séparé** (pas embedded dans Tauri) — permet de le déployer en cloud sans modifier le code
5. **YAML comme format de config** — lisible humainement, versionnable en git, importable/exportable
6. **Plugin system Python** pour les tools — extensible sans toucher au core

---

*Document généré le 28 mai 2026 — à faire évoluer avec le projet*

---

## 12. Plugin System (Universel)

Un plugin peut être **n'importe lequel des trois** : agent, tool, ou provider. Le système est identique pour les trois — un seul format, un seul registry.

### Format d'un plugin (Python)

```python
# plugins/my_plugin/__init__.py
from agentos.plugin import AgentOSPlugin, PluginType

class MyPlugin(AgentOSPlugin):
    type = PluginType.TOOL          # ou AGENT, ou PROVIDER
    name = "my_plugin"
    version = "1.0.0"
    description = "Ce que fait mon plugin"
    config_schema = {               # Champs configurables dans l'UI
        "api_key": {"type": "string", "secret": True},
        "max_results": {"type": "int", "default": 10},
    }

    async def execute(self, input: dict, config: dict) -> dict:
        # Logique du plugin
        return {"result": "..."}
```

C'est tout. Le plugin est auto-découvert, auto-configuré dans l'UI, et disponible immédiatement.

### Types de plugins

| Type | Exemples |
|------|----------|
| **Tool plugin** | Notion, GitHub, Slack, Jira, web scraper, PDF reader, DB connector |
| **Agent plugin** | Rôle custom avec comportement spécifique (Legal Reviewer, SEO Writer...) |
| **Provider plugin** | Nouveau modèle IA (Gemini, Cohere, Grok, API custom) |

### Distribution des plugins
- **Built-in** : livrés avec AgentOS (web search, file system, code sandbox...)
- **Community** : installables via `agentos plugin install <nom>` (registry central)
- **Local** : dossier `plugins/` dans le workspace, chargé automatiquement
- **Private** : chemin absolu ou URL git privé

### Plugin Registry (UI)
- Vue liste de tous les plugins installés (actifs/inactifs)
- Configuration par plugin (champs secrets chiffrés localement)
- Marketplace future (plugins community)

---

## 13. Workspace Execution Layer

C'est la feature la plus différenciante. Chaque workspace peut s'exécuter sur **n'importe quelle target** — switchable sans changer le code des agents.

### Targets supportées

| Target | Cas d'usage | Config |
|--------|-------------|--------|
| **Local filesystem** | Dev quotidien, perso | Chemin dossier |
| **SSH distant** | Serveur perso, VPS, machine de prod | Host + clé SSH |
| **Docker container** | Isolation totale, reproductibilité | Image + volumes |
| **Docker remote** | Container sur serveur distant | Host Docker + image |
| **Codex-style cloud** | Scale, collaboration future | API endpoint + token |

### Architecture de l'Execution Layer

```
WorkspaceExecutor (interface abstraite)
    ├── LocalExecutor       → subprocess + local FS
    ├── SSHExecutor         → Paramiko + SFTP
    ├── DockerExecutor      → Docker SDK Python
    ├── DockerRemoteExecutor→ Docker SDK remote host
    └── CloudExecutor       → HTTP API (future)
```

Chaque Executor expose la même interface :
```python
class WorkspaceExecutor(ABC):
    async def execute_code(self, code: str, lang: str) -> ExecutionResult
    async def read_file(self, path: str) -> bytes
    async def write_file(self, path: str, content: bytes) -> None
    async def list_files(self, path: str) -> list[str]
    async def stream_logs(self) -> AsyncIterator[str]
```

Les agents n'ont aucune connaissance de la target — ils appellent toujours la même interface.

### Config YAML d'un workspace avec execution layer

```yaml
workspace:
  name: "My Dev Project"
  
  execution:
    target: ssh                    # local | ssh | docker | docker-remote | cloud
    
    ssh:
      host: "192.168.1.100"
      port: 22
      user: "ubuntu"
      key_path: "~/.ssh/id_ed25519"
      working_dir: "/home/ubuntu/projects/myapp"
      
    # ou docker:
    docker:
      image: "python:3.12-slim"
      volumes:
        - "./workspace:/app"
      env:
        - "PYTHONPATH=/app"
      
    # ou cloud (futur):
    cloud:
      endpoint: "https://api.agentos.io/v1/execute"
      token: "${AGENTOS_TOKEN}"
      region: "eu-west"
```

### Switching en live
L'UI permet de switcher la target d'exécution d'un workspace **sans redémarrer** — les agents en cours terminent leur step, puis le prochain step s'exécute sur la nouvelle target.

---

## 14. Orchestration Engine (Adapter Pattern)

Les frameworks existants (LangGraph, CrewAI, AutoGen, MetaGPT) sont des **adapters optionnels** — pas le core. Le core d'AgentOS est son propre engine, et les frameworks sont branchables dessus.

### Architecture

```
AgentOS Core Engine
    │
    ├── OrchestratorAdapter (interface)
    │       ├── NativeAdapter      ← Engine custom AgentOS (défaut)
    │       ├── LangGraphAdapter   ← Wraps LangGraph
    │       ├── CrewAIAdapter      ← Wraps CrewAI
    │       ├── AutoGenAdapter     ← Wraps AutoGen
    │       └── CustomAdapter      ← Plugin engine (Python class)
    │
    └── Fonctionnalités AgentOS (toujours disponibles quel que soit l'adapter)
            ├── Checkpoint & Resume
            ├── Terminal visuel
            ├── Cost tracker
            ├── Audit trail
            ├── Human-in-the-loop
            └── Graceful degradation
```

**Point clé** : le checkpoint, le monitoring, le terminal, le cost tracker — tout ça vit dans AgentOS Core, pas dans l'adapter. Donc même si tu utilises CrewAI comme engine, tu gardes toutes les features AgentOS par-dessus.

### Config par workspace

```yaml
workspace:
  orchestration:
    engine: native              # native | langgraph | crewai | autogen | custom
    
    # Si custom :
    custom:
      module: "my_engine.adapter"
      class: "MyEngineAdapter"
```

### Pourquoi les frameworks existants manquent de choses

| Problème documenté | Solution AgentOS |
|-------------------|-----------------|
| Pas de terminal visuel par agent | xterm.js par agent, streaming natif |
| Pas de checkpoint robuste | Engine de checkpoint indépendant du framework |
| Pas de cost tracking granulaire | Cost tracker au niveau token, par agent |
| Pas de workspace execution layer | Executor abstrait (local/SSH/docker/cloud) |
| Pas de plugin system universel | Plugin = agent/tool/provider, même API |
| Pas de graceful degradation | Provider router avec fallback auto |
| Pas d'UI pro | App desktop Tauri, pas une WebUI bricolée |
| Rôles ambigus entre agents | System prompt structuré + validation Critic |

---

## 15. Décisions finales d'architecture (mise à jour)

| Décision | Choix | Raison |
|----------|-------|--------|
| Plugin system | Interface Python unique pour agent/tool/provider | Un seul pattern à apprendre |
| Execution layer | Adapter pattern avec interface commune | Swap target sans changer les agents |
| Orchestration engine | Core custom + adapters frameworks | Features AgentOS indépendantes du framework |
| Plugin discovery | Auto-scan dossier `plugins/` + registry central | Zéro config pour plugins locaux |
| Secrets management | Chiffrement AES local (keyring OS) | Pas de secrets en clair dans les YAML |
| Inter-agent comms | Message bus interne (asyncio queues) | Pas de couplage direct entre agents |

*Mise à jour — 28 mai 2026*

---

## 16. Agent Identity Layer (ce qui rend chaque agent unique)

Un agent n'est pas juste un LLM + un prompt. C'est une entité avec une identité complète, persistante, évolutive.

### 16.1 Anatomie complète d'un agent

```yaml
agent:
  # ── IDENTITÉ ──────────────────────────────────────────
  id: "agent_senior_researcher_01"
  name: "Alexandra"
  avatar: "🔬"                        # emoji ou chemin image
  created_at: "2026-05-28"
  version: "3"                        # versionné à chaque modification

  # ── RÔLE ──────────────────────────────────────────────
  role:
    title: "Senior Research Analyst"
    hierarchy_level: 2                # 0=CEO, 1=Manager, 2=Worker, 3=SubAgent
    reports_to: "agent_manager_01"
    can_delegate_to:                  # agents qu'elle peut mandater
      - "agent_web_researcher"
      - "agent_data_analyst"
    is_transversal: false             # true = Critic, QA, etc. (pas dans la chaîne)

  # ── PERSONNALITÉ ──────────────────────────────────────
  personality:
    tone: "precise, slightly formal, direct"
    style: "uses bullet points, cites sources, no fluff"
    biases:
      strengths: ["deep research", "cross-referencing", "skepticism"]
      weaknesses: ["slow on creative tasks", "over-documents simple things"]
    behavior_rules:
      - "Always ask for clarification before a task > 30 min"
      - "Never make claims without at least 2 sources"
      - "Flag uncertainty explicitly with [UNCERTAIN]"

  # ── SKILLS ────────────────────────────────────────────
  skills:
    - id: "web_research"
      mastery: expert                 # novice | junior | intermediate | senior | expert
    - id: "data_analysis"
      mastery: senior
    - id: "report_writing"
      mastery: intermediate
    - id: "python_coding"
      mastery: junior

  # ── TOOLS ─────────────────────────────────────────────
  tools:
    allowed: [web_search, file_read, file_write, python_sandbox]
    denied: [shell_exec, db_write]    # override explicite
    rate_limits:
      web_search: 20/hour
      python_sandbox: 5/run

  # ── MÉMOIRE ───────────────────────────────────────────
  memory:
    short_term:
      max_tokens: 32000
      strategy: sliding_window       # sliding_window | summarize | hybrid
    long_term:
      enabled: true
      shared_with: ["agent_manager_01"]
      decay:
        enabled: true
        half_life_days: 30           # les souvenirs vieillissent, poids réduit
        min_weight: 0.1              # jamais complètement oublié
    episodic:
      enabled: true                  # log de chaque run = mémoire d'expérience
      max_entries: 500

  # ── MODÈLE ────────────────────────────────────────────
  model:
    provider: anthropic
    model_id: claude-sonnet-4
    fallback_chain:                  # si provider down → fallback auto
      - provider: openai
        model_id: gpt-4o
      - provider: ollama
        model_id: llama3:8b
    parameters:
      temperature: 0.3
      max_tokens: 4096
      top_p: 0.9

  # ── GUARDRAILS ────────────────────────────────────────
  guardrails:
    budget:
      max_cost_per_run_usd: 0.50
      max_tokens_per_run: 100000
      on_exceed: pause_and_notify    # pause_and_notify | kill | continue
    content:
      blocked_domains: ["adult", "illegal"]
      pii_detection: true            # détecte et masque les données perso
    scope:
      allowed_file_paths: ["./workspace/research/"]
      allowed_urls: ["*"]
      denied_urls: ["internal.company.com/*"]

  # ── SCHEDULING (crons) ────────────────────────────────
  schedule:
    enabled: false
    cron: "0 9 * * 1"               # tous les lundis à 9h
    task: "Compile weekly research digest"
    notify_on_complete: true

  # ── SELF-IMPROVEMENT ──────────────────────────────────
  self_improvement:
    enabled: true
    after_each_run:
      self_reflect: true             # l'agent s'auto-évalue après chaque run
      update_own_notes: true         # peut annoter son propre profil
    skill_progression:
      enabled: true
      eval_metric: critic_score      # score donné par le Critic agent
      promote_threshold: 0.85        # au-delà → monte de niveau
      demote_threshold: 0.50         # en-dessous → rétrogradation
```

---

## 17. Skill System (détail complet)

Un skill = un bundle autonome et réutilisable : prompt spécialisé + tools requis + mémoire dédiée + niveau de maîtrise.

### 17.1 Format d'un skill

```yaml
# skills/web_research.yaml
skill:
  id: "web_research"
  name: "Web Research"
  category: technical               # technical | domain | soft
  description: "Recherche d'informations sur le web avec synthèse"

  mastery_levels:
    novice:
      prompt_modifier: "Use only the first result. Summarize briefly."
      tools: [web_search]
      max_searches_per_task: 3

    junior:
      prompt_modifier: "Cross-reference at least 2 sources. Flag contradictions."
      tools: [web_search]
      max_searches_per_task: 8

    intermediate:
      prompt_modifier: "Evaluate source credibility. Distinguish facts from opinions."
      tools: [web_search, web_fetch]
      max_searches_per_task: 15

    senior:
      prompt_modifier: "Deep research with primary sources. Build a knowledge graph."
      tools: [web_search, web_fetch, file_write]
      max_searches_per_task: 30

    expert:
      prompt_modifier: |
        You are a world-class research analyst. Use advanced search operators.
        Cross-reference primary, secondary and tertiary sources.
        Produce structured briefs with confidence levels per claim.
      tools: [web_search, web_fetch, file_write, python_sandbox]
      max_searches_per_task: unlimited

  prerequisites: []                  # skills requis avant d'acquérir celui-ci
  synergies: ["report_writing", "data_analysis"]  # booste ces skills si combiné
```

### 17.2 Catalogue de skills built-in

**Skills techniques**
- `web_research` (novice → expert)
- `data_analysis` (novice → expert)
- `python_coding` (novice → expert)
- `javascript_coding` (novice → expert)
- `sql_queries` (novice → expert)
- `file_management` (novice → expert)
- `api_integration` (novice → expert)
- `pdf_processing` (novice → expert)

**Skills domaine métier**
- `report_writing` (novice → expert)
- `seo_optimization` (novice → expert)
- `market_research` (novice → expert)
- `legal_analysis` (novice → expert)
- `financial_analysis` (novice → expert)
- `project_planning` (novice → expert)
- `copywriting` (novice → expert)
- `translation` (novice → expert)

**Skills transversaux**
- `task_decomposition` (CEO/Manager uniquement)
- `quality_review` (Critic uniquement)
- `conflict_resolution` (Manager uniquement)
- `spawning` (peut créer des sous-agents)

### 17.3 Skill progression & apprentissage

Après chaque run, le Critic agent attribue un score à chaque output. Ce score s'accumule et, une fois le seuil atteint, le skill monte de niveau automatiquement — avec notification dans l'UI.

```
Runs avec score ≥ 0.85 : ████████░░  8/10 → Promotion prochaine
Niveau actuel           : intermediate
Prochain niveau         : senior
```

Les skills sont partageables : exporter un skill depuis un agent, l'importer dans un autre.

---

## 18. Système de Rôles (dynamique)

### 18.1 Rôles de base (statiques)
Définis à la création de l'agent, persistent entre les sessions.

| Rôle | Niveau | Capacités |
|------|--------|-----------|
| CEO / Director | 0 | Décompose, délègue, agrège, arbitre |
| Manager | 1 | Supervise une équipe, redistribue, reporte |
| Worker | 2 | Exécute des tâches spécialisées |
| SubAgent | 3 | Spawné dynamiquement, vie courte |
| Critic | transversal | Évalue tous les outputs, vote sur les conflits |
| Observer | transversal | Monitore sans agir (logging, analytics) |

### 18.2 Rôles temporaires (dynamiques)
Le CEO peut assigner des rôles temporaires en cours de run, qui s'effacent à la fin.

```yaml
# Assigné dynamiquement pendant un run
temporary_role:
  agent: "agent_worker_03"
  role: "Lead Researcher"
  scope: "current_run_only"
  permissions_added: [file_write, delegate_to_subagents]
  expires_after: "task_completion"
```

### 18.3 Résolution de conflits entre agents

Quand deux agents ont des outputs contradictoires :
1. **Vote** : le Critic agent tranche
2. **Escalade** : remonte au Manager qui arbitre
3. **Merge** : les deux outputs sont fusionnés avec attribution explicite
4. **Human gate** : pause et demande à l'utilisateur

Configurable par workspace et par type de conflit.

---

## 19. Agent Spawning Dynamique

Un agent peut créer des sous-agents temporaires si la tâche dépasse ses capacités — comme un employé qui recrute un prestataire pour une mission ponctuelle.

### Conditions de spawning
```yaml
spawning:
  enabled: true
  conditions:
    - trigger: "task_complexity_score > 0.8"
      action: spawn_subagent
      preset: Researcher
      max_concurrent: 3
    - trigger: "skill_required not in agent.skills"
      action: spawn_subagent
      preset: auto                  # choisit le preset selon le skill manquant
  
  subagent_lifecycle:
    max_duration_minutes: 60
    auto_kill_on_completion: true
    share_memory_with_parent: true
```

Les sous-agents apparaissent dans l'UI avec un badge "🔄 Temporaire" et leur terminal est visible comme tout autre agent.

---

## 20. Memory Decay & Episodic Memory

### Memory decay
Les souvenirs ne sont pas égaux dans le temps. Un souvenir récent pèse plus qu'un ancien.

```python
# Poids d'un souvenir selon son âge
weight = base_weight * exp(-lambda * days_since_creation)
# half_life_days = 30 → après 30 jours, le poids est divisé par 2
# Le souvenir reste mais influence moins le contexte
```

Configurable par agent : half-life, poids minimum, stratégie de purge.

### Episodic memory
Après chaque run, un résumé structuré est sauvegardé dans la mémoire épisodique de l'agent :

```json
{
  "run_id": "run_2026_05_28_001",
  "task": "Research competitors in fintech",
  "duration_min": 12,
  "tools_used": ["web_search", "file_write"],
  "outputs": ["report_competitors.md"],
  "critic_score": 0.87,
  "lessons_learned": "SerpAPI returned stale results for fintech queries — prefer Brave",
  "self_notes": "Next time: start with LinkedIn before general web search"
}
```

Ces épisodes alimentent le self-improvement : l'agent consulte ses propres runs passés avant de commencer une tâche similaire.

---

## 21. Agent Versioning

Chaque modification d'un agent crée une nouvelle version, comme un commit git.

```
agent: Alexandra (Senior Research Analyst)
├── v1  2026-05-01  Création initiale
├── v2  2026-05-10  Ajout skill data_analysis (junior)
├── v3  2026-05-28  Promotion web_research → expert (auto)
└── v4  [current]  Guardrail budget ajusté à $0.50/run
```

- Revenir à une version précédente en un clic
- Comparer les performances entre versions (runs, scores, coûts)
- Brancher : créer un agent dérivé d'une version (fork)
- Exporter/importer des versions (partage entre workspaces)

---

## 22. Guardrails & Permissions (détail)

Trois niveaux de guardrails qui se combinent :

### Global (toute l'app)
- Budget maximum absolu (protection compte IA)
- Domaines de contenu interdits
- PII detection globale

### Workspace
- Budget max par workspace
- Paths de fichiers accessibles
- URLs autorisées/interdites
- Providers autorisés pour ce workspace

### Agent
- Budget max par run
- Tools autorisés/interdits explicitement
- Scope fichiers restreint
- Rate limits par tool
- Comportement si dépassement (pause / kill / notifier)

### Permission inheritance
```
Global > Workspace > Agent
```
Un agent ne peut jamais avoir des permissions supérieures à son workspace, qui ne peut jamais dépasser le global. Un agent peut en revanche être plus restreint que son workspace.

---

## 23. Agent Scheduling (Crons)

Des agents qui tournent de façon autonome, sans intervention humaine.

```yaml
schedule:
  - agent: "agent_researcher_01"
    cron: "0 7 * * 1-5"            # lun-ven à 7h
    task: "Morning briefing: latest news in {workspace.topic}"
    output: "reports/daily_briefing.md"
    notify: true

  - agent: "agent_analyst_01"
    cron: "0 18 * * 5"             # vendredi 18h
    task: "Weekly performance summary"
    trigger_after: ["agent_researcher_01"]  # enchaîné
```

Visible dans un calendrier dans l'UI. Chaque run schedulé apparaît dans le dashboard avec son statut.

---

## 24. Ce qu'on n'oublie pas (checklist exhaustive)

### Agent layer
- [x] Identité complète (nom, avatar, personnalité, biais, style)
- [x] Rôles statiques + dynamiques
- [x] Skills avec niveaux de maîtrise et progression
- [x] Mémoire courte / longue / épisodique / partagée
- [x] Memory decay (vieillissement des souvenirs)
- [x] Self-reflection et auto-amélioration post-run
- [x] Spawning dynamique de sous-agents
- [x] Versioning complet avec fork
- [x] Guardrails multi-niveaux
- [x] Scheduling / crons autonomes
- [x] Fallback provider automatique
- [x] Conflict resolution configurable

### System layer
- [x] Plugin system universel (agent / tool / provider)
- [x] Workspace execution layer (local / SSH / Docker / cloud)
- [x] Engine adapter (LangGraph / CrewAI / AutoGen / custom)
- [x] Checkpoint & Resume
- [x] Cost tracker granulaire par agent
- [x] Audit trail complet
- [x] Human-in-the-loop gates
- [x] Terminal visuel interactif par agent
- [x] Monitoring dashboard live
- [x] Secrets management (chiffrement OS keyring)
- [x] YAML import/export de toute configuration
- [x] Agent marketplace (futur)

*Mise à jour — 28 mai 2026*

---

## 25. Système de Rôles Multi-dimensionnels

Un agent peut avoir plusieurs rôles simultanément — comme un humain qui est à la fois "Lead Developer", "Code Reviewer" et "On-call Engineer" selon le contexte.

### 25.1 Dimensions de rôles

```yaml
agent:
  roles:
    # Rôle organisationnel (position dans la hiérarchie)
    organizational:
      level: worker                  # ceo | manager | worker | subagent
      reports_to: "manager_01"
      team: "engineering"

    # Rôles fonctionnels (ce que l'agent sait faire)
    functional:
      - id: "lead_developer"
        priority: 1                  # rôle primaire
        context: "when task involves architecture decisions"
      - id: "code_reviewer"
        priority: 2
        context: "when reviewing PRs or outputs of other agents"
      - id: "debugger"
        priority: 3
        context: "when tests fail or errors are detected"

    # Rôles situationnels (assignés dynamiquement par le CEO/Manager)
    situational:
      - id: "incident_lead"
        assigned_by: "ceo_agent"
        scope: "current_run"
        expires: "task_completion"
      - id: "domain_expert_fintech"
        assigned_by: "manager_01"
        scope: "workspace"           # persiste dans ce workspace
        expires: null                # permanent dans ce workspace

    # Rôles transversaux (indépendants de la hiérarchie)
    transversal:
      - "quality_gate"               # peut bloquer un output si score < seuil
      - "security_reviewer"          # activé sur tout code produit dans le workspace
```

### 25.2 Role switching automatique

Le CEO/Manager peut switcher le rôle actif d'un agent en cours de run selon le contexte :

```
Task: "Build a REST API"
→ Agent "Alex" activates role: architect     (phase design)
→ Agent "Alex" activates role: developer     (phase coding)
→ Agent "Alex" activates role: code_reviewer (phase review d'un autre agent)
→ Agent "Alex" activates role: debugger      (phase fix des tests qui échouent)
```

Chaque rôle a son propre prompt modifier, ses tools actifs, et ses contraintes.

### 25.3 Role marketplace (built-in + custom)

Rôles built-in disponibles dès l'installation :

| Rôle | Comportement | Skills requis |
|------|-------------|---------------|
| `architect` | Conçoit, documente, ne code pas | system_design, documentation |
| `developer` | Code, teste, commit | coding, testing |
| `code_reviewer` | Review PR, détecte bugs, suggère | code_review, security |
| `debugger` | Diagnostique et corrige | debugging, log_analysis |
| `tech_lead` | Coordonne l'équipe tech | delegation, planning |
| `qa_engineer` | Tests, edge cases, validation | testing, automation |
| `devops` | Deploy, infra, pipelines | shell, docker, ci_cd |
| `security_auditor` | Détecte vulns, OWASP | security, code_review |
| `product_manager` | Specs, priorisation, roadmap | planning, writing |
| `technical_writer` | Docs, README, changelogs | writing, code_reading |
| `data_scientist` | Analyse, modèles, notebooks | python, data_analysis |
| `ux_researcher` | UX, feedback, personas | research, writing |

Chaque rôle est un fichier YAML exportable/importable/partageable.

---

## 26. Harness Anti-Flemmardise (Persistence Engine)

**Le vrai problème** : un LLM seul s'arrête dès qu'il pense avoir "répondu". Pour construire une vraie app, il faut une équipe d'agents qui ne s'arrête pas tant que le travail n'est pas terminé — avec des mécanismes structurels pour empêcher la dérive, la flemme et l'abandon.

### 26.1 Goal Anchoring (anti-dérive)

Chaque run est ancré sur un **Goal Object** immuable, injecté dans chaque prompt de chaque agent à chaque step.

```yaml
goal:
  id: "run_2026_05_28_build_api"
  title: "Build a complete REST API for user management"
  
  definition_of_done:              # critères objectifs de fin
    - "All endpoints documented in OpenAPI spec"
    - "Test coverage ≥ 80%"
    - "No failing tests"
    - "README updated"
    - "Docker compose working"
  
  constraints:
    - "Use FastAPI + PostgreSQL"
    - "Follow existing codebase conventions"
    - "No new dependencies without approval"
  
  out_of_scope:
    - "Frontend"
    - "Authentication (already done)"
  
  checkpoints:                     # jalons intermédiaires obligatoires
    - "Architecture documented"
    - "Models defined"
    - "Endpoints coded"
    - "Tests written"
    - "Integration tested"
```

Le Goal Object est **readonly** pendant le run. Aucun agent ne peut le modifier — seul l'humain peut via une human gate.

### 26.2 Progress Tracker (anti-abandon)

Un tracker de progression partagé entre tous les agents, mis à jour en temps réel :

```
Goal: Build REST API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Architecture documented        [Alex — 14:02]
✅ Models defined                 [Alex — 14:18]
🔄 Endpoints coded               [Maya — in progress — 47%]
⏳ Tests written                  [pending]
⏳ Integration tested             [pending]
⏳ Definition of Done check       [pending]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Completion: 38% | Cost: $0.42 | Runtime: 00:32:14
```

Si un agent marque un checkpoint comme "done" sans preuve (fichier créé, test passé, etc.), le Progress Tracker le rejette et le renvoie travailler.

### 26.3 Équipe de coding complète (built-in template)

Template d'équipe prête à l'emploi pour construire n'importe quelle app :

```
CEO Agent (Director)
│   "Décompose en tâches, assigne, vérifie les checkpoints"
│
├── Architect Agent
│   "Conçoit l'architecture, écrit les specs, valide les choix tech"
│
├── Developer Agent(s) [scalable : 1 à N en parallèle]
│   "Code, teste, commit. Ne s'arrête que si tous les tests passent."
│
├── Code Reviewer Agent
│   "Review chaque PR. Bloque si standards non respectés."
│
├── QA Agent
│   "Écrit et exécute les tests. Génère edge cases. Refuse de valider < 80% coverage."
│
├── Debugger Agent (activé à la demande)
│   "Spawné si tests échouent. Diagnostique, corrige, disparaît."
│
└── Tech Writer Agent
    "Documente au fur et à mesure. Mise à jour README + changelog."
```

### 26.4 Persistence Rules (ce qui empêche un agent de "s'arrêter")

Règles systémiques injectées dans tous les agents de l'équipe :

```python
PERSISTENCE_RULES = """
RÈGLES ABSOLUES :
1. Tu ne t'arrêtes JAMAIS avant que ton checkpoint soit objectivement validé.
2. "C'est fait" ne suffit pas — le système vérifie avec des critères concrets.
3. Si tu bloques depuis plus de {timeout} minutes, tu escalades au Manager.
4. Si tu échoues 3 fois sur la même tâche, tu demandes de l'aide.
5. Tu ne réécris JAMAIS du code qui fonctionne sans raison explicite.
6. Chaque fichier modifié est loggué. Chaque test lancé est loggué.
7. Tu consultes l'episodic memory avant de commencer une tâche similaire.
8. Le Goal Object est ta boussole — si une action ne sert pas le goal, ne la fais pas.
"""
```

### 26.5 Validation Gates automatiques

Entre chaque étape, des gates automatiques vérifient que le travail est réellement fait :

| Gate | Vérification automatique |
|------|--------------------------|
| Code written | Fichiers existent + syntaxe valide |
| Tests written | Fichiers test existent + s'exécutent sans erreur de syntaxe |
| Tests passing | `pytest` retourne 0 erreurs |
| Coverage OK | Coverage ≥ seuil configuré |
| Docs updated | README modifié depuis le début du run |
| No regression | Tests existants toujours verts |

Si une gate échoue → l'agent responsable est automatiquement réactivé avec le feedback d'erreur précis.

---

## 27. Token Harness (optimisation des coûts)

**Le problème** : un système multi-agents naïf consomme 4 à 15x plus de tokens qu'un appel simple. AgentOS intègre un moteur d'optimisation des coûts à tous les niveaux.

### 27.1 Prompt Caching (économie jusqu'à 90%)

Les parties statiques des prompts (system prompts, skill definitions, goal object, workspace config) sont mises en cache au niveau provider.

```python
# Architecture du prompt avec caching
prompt_structure = [
    # PARTIE CACHÉE (ne change jamais dans un run)
    {"role": "system", "content": SYSTEM_PROMPT, "cache": True},
    {"role": "system", "content": SKILL_DEFINITIONS, "cache": True},
    {"role": "system", "content": GOAL_OBJECT, "cache": True},
    
    # PARTIE DYNAMIQUE (change à chaque step — non cachée)
    {"role": "user", "content": CURRENT_TASK},
    {"role": "assistant", "content": PREVIOUS_OUTPUT},
    {"role": "user", "content": NEW_INSTRUCTION},
]
# Économie typique : 60-90% sur les tokens d'entrée
```

### 27.2 Context Compression (auto)

Quand le contexte approche de la limite, AgentOS compresse automatiquement l'historique :

```
Stratégies de compression (configurables par agent) :
├── sliding_window   : garde les N derniers messages
├── summarize        : résume l'historique en un bloc compact
├── hierarchical     : résumé + messages récents (meilleur compromis)
└── selective        : garde seulement les messages avec tool calls + leurs résultats
```

La compression active de contexte permet une réduction de 22% des tokens avec une précision identique, et jusqu'à 57% de réduction sur certaines tâches intensives.

### 27.3 Model Routing intelligent

Pas besoin d'utiliser GPT-4o pour chaque step. AgentOS route chaque appel vers le modèle le moins cher capable de faire le job :

```yaml
model_routing:
  rules:
    - condition: "task_type == 'simple_classification'"
      model: "gpt-4o-mini"          # 15x moins cher
    - condition: "task_type == 'code_generation'"
      model: "claude-sonnet-4"      # bon équilibre qualité/coût
    - condition: "task_type == 'architecture_review'"
      model: "claude-opus-4"        # meilleure qualité
    - condition: "task_type == 'summarization'"
      model: "llama3:8b"            # local = gratuit
    - default:
      model: "claude-sonnet-4"
```

Économie typique : 40-70% selon le mix de tâches.

### 27.4 Semantic Caching

Si deux agents posent des questions similaires (même embedding), le second reçoit le résultat du premier sans appel API :

```
Agent A demande  : "What is the FastAPI dependency injection pattern?"
→ Appel API      : 1200 tokens, $0.004

Agent B demande  : "How does FastAPI handle dependencies?"  
→ Similarity 0.94 → Cache hit
→ Appel API      : 0 tokens, $0.000
```

Configurable : seuil de similarité, TTL du cache, scope (run / workspace / global).

### 27.5 Inter-agent Communication Optimisée

Les agents ne se transmettent pas leurs outputs bruts — ils transmettent des **summaries structurés** :

```python
# ❌ Naïf : 8000 tokens transmis entre agents
message = full_agent_output  # tout le contexte + raisonnement

# ✅ Optimisé : 200 tokens transmis
message = {
    "status": "completed",
    "checkpoint": "endpoints_coded",
    "artifacts": ["src/api/users.py", "src/api/auth.py"],
    "summary": "Implemented 6 CRUD endpoints for users. All typed with Pydantic.",
    "issues": [],
    "next_step_suggestion": "Write tests for edge cases on DELETE /users/{id}"
}
```

### 27.6 Budget Dashboard live

```
┌─────────────────────────────────────────────────────┐
│  Token Harness — Run #42                             │
├─────────────────────────────────────────────────────┤
│  Budget alloué    : $2.00                            │
│  Consommé         : $0.67  ████░░░░░░  33%           │
│  Économisé        : $1.89  (prompt cache + routing)  │
│  Projection fin   : $1.24  ✅ sous le budget         │
├──────────────────────┬──────────────────────────────┤
│  Agent               │  Tokens  │  Coût   │  Cache % │
├──────────────────────┼──────────┼─────────┼──────────┤
│  Director (Claude)   │   12,400 │  $0.18  │   82%    │
│  Architect (Claude)  │   28,100 │  $0.31  │   71%    │
│  Developer (GPT-4o)  │   41,200 │  $0.14  │   68%    │
│  QA (GPT-4o-mini)    │    8,900 │  $0.02  │   90%    │
│  Tech Writer (Llama) │    6,200 │  $0.00  │    —     │
└──────────────────────┴──────────┴─────────┴──────────┘
```

### 27.7 Anti-patterns détectés automatiquement

AgentOS détecte et corrige les patterns qui font exploser les coûts :

| Anti-pattern | Détection | Correction auto |
|--------------|-----------|-----------------|
| Agents qui se répètent (doublon de travail) | Similarité élevée entre outputs | Fusionner + notifier |
| Contexte qui grossit sans compression | Tokens > 80% du window | Compression automatique |
| Appel flagship pour tâche simple | Classification de la tâche | Rerouter vers modèle moins cher |
| Aucun caching sur system prompts | Analyse de la structure | Ajouter cache_control |
| Agent qui boucle sans progresser | Progress tracker stagnant | Escalade au Manager |

---

## 28. Checklist finale complète (mise à jour)

### Agent Identity & Roles
- [x] Rôles organisationnels (CEO/Manager/Worker/SubAgent)
- [x] Rôles fonctionnels multiples par agent
- [x] Rôles situationnels assignés dynamiquement
- [x] Rôles transversaux (Critic, Security Auditor...)
- [x] Role marketplace avec built-ins + custom YAML
- [x] Role switching automatique selon le contexte du run

### Skills
- [x] Skills techniques + domaine métier
- [x] Niveaux de maîtrise (novice → expert) avec prompt + tools différents
- [x] Progression automatique basée sur les scores Critic
- [x] Prérequis et synergies entre skills
- [x] Skills exportables/importables entre agents

### Harness Anti-flemmardise
- [x] Goal Object immuable ancré dans chaque prompt
- [x] Progress Tracker partagé avec validation objective des checkpoints
- [x] Persistence Rules injectées dans tous les agents
- [x] Validation Gates automatiques (tests, coverage, fichiers)
- [x] Template équipe coding complète (Architect/Dev/Reviewer/QA/Debugger/Writer)
- [x] Escalade automatique si blocage

### Token Harness (coûts)
- [x] Prompt caching (jusqu'à 90% d'économie)
- [x] Context compression automatique (sliding window / summarize / hybrid)
- [x] Model routing intelligent selon la complexité de la tâche
- [x] Semantic caching inter-agents
- [x] Inter-agent communication compressée (summaries structurés)
- [x] Budget dashboard live avec projection
- [x] Détection automatique des anti-patterns coûteux

*Mise à jour — 28 mai 2026*

---

## 29. Token Harness — Pricing Matrix 2026 (modèles cibles)

### Stratégie provider par rôle d'agent

Le principe : chaque rôle n'a pas besoin du même modèle. On utilise le moins cher qui fait le job.

| Rôle agent | Modèle recommandé | Pourquoi | Coût estimé/run |
|------------|------------------|----------|-----------------|
| CEO / Director | Gemini 3 Flash (thinking: low) | Long context 1M, raisonnement contrôlable, $1.50/M input | ~$0.08 |
| Architect | GPT-5.4 | Meilleur instruction-following, $2.50/M | ~$0.05 |
| Developer(s) | DeepSeek V4 Flash (cached) | $0.0028/M sur cache hit — quasi gratuit sur les répétitions | ~$0.01 |
| Code Reviewer | DeepSeek V4 Flash | Même raison, review = beaucoup de contexte répété | ~$0.005 |
| QA Agent | GPT-5.4 Nano / Mini | Tâches structurées simples, $0.10-0.30/M | ~$0.002 |
| Debugger (spawné) | DeepSeek V4 Flash | Courte durée, contexte partagé = cache maximal | ~$0.003 |
| Tech Writer | Gemini 3 Flash (thinking: minimal) | Excellent pour la prose, pas besoin de reasoning lourd | ~$0.004 |
| Critic / QA Gate | Gemini 2.5 Flash | Jugement rapide, prompt court, $0.30/M | ~$0.002 |

**Coût total estimé d'un run "build full REST API" : $0.15-0.40** avec cette matrice, contre $3-8 avec une approche naïve tout-GPT-5.5.

### Pricing reference (mai 2026)

```
DEEPSEEK (le moins cher du marché)
  V4 Flash  : $0.14/M input | $0.0028/M cache hit | $0.28/M output
  V4 Pro    : $1.74/M input | $0.0145/M cache hit  | $3.48/M output
  Context   : 1M tokens | Max output : 384K tokens
  Caching   : automatique (pas de configuration requise)
  Avantage  : 90-99% moins cher que GPT-5.5 sur cache hits

GEMINI (Google)
  3 Flash       : $1.50/M input | $0.15/M cached | $9.00/M output
  2.5 Flash     : $0.30/M input | inclus         | $2.50/M output
  Flash-Lite    : optimisé vitesse/coût, thinking OFF par défaut
  Thinking ctrl : thinking_level = minimal|low|medium|high
  Batch API     : -50% sur tous les tokens (tâches async)
  Avantage      : 1M context, thinking budget contrôlable au call

OPENAI
  GPT-5.4       : $2.50/M input | $0.50/M cached | $15/M output
  GPT-5.4 Nano  : $0.30/M input | inclus         | $1.20/M output
  GPT-5.3 Codex : $1.75/M input                  | $14/M output (coding)
  Batch/Flex    : -50% sur les workloads async
  Cache hit     : -90% sur GPT-5.5 ($5 → $0.50/M)
  Avantage      : meilleur instruction-following, tooling le plus mature

QWEN (Alibaba, open-weight)
  Qwen3.6-35B   : 3B paramètres actifs (MoE), 262K context
  SWE-Bench     : 73.4% (très bon pour le code)
  Déploiement   : local via Ollama sur GPU unique (= $0 API)
  Avantage      : fallback local gratuit si tous les providers sont down
```

### Règles de routing automatique dans AgentOS

```python
MODEL_ROUTING_MATRIX = {
    # Tâches de raisonnement lourd
    "architecture_design":    {"provider": "gemini", "model": "3-flash",   "thinking": "medium"},
    "complex_debugging":      {"provider": "openai",  "model": "gpt-5.4",   "thinking": None},
    
    # Tâches de code (volume élevé = cache critique)
    "code_generation":        {"provider": "deepseek","model": "v4-flash",  "thinking": False},
    "code_review":            {"provider": "deepseek","model": "v4-flash",  "thinking": False},
    "syntax_check":           {"provider": "deepseek","model": "v4-flash",  "thinking": False},
    
    # Tâches légères (classification, routing interne)
    "task_classification":    {"provider": "openai",  "model": "gpt-5.4-nano","thinking": None},
    "checkpoint_validation":  {"provider": "gemini",  "model": "flash-lite","thinking": "minimal"},
    
    # Rédaction / documentation
    "documentation":          {"provider": "gemini",  "model": "3-flash",   "thinking": "minimal"},
    "summarization":          {"provider": "deepseek","model": "v4-flash",  "thinking": False},
    
    # Fallback local (offline / budget épuisé)
    "fallback":               {"provider": "ollama",  "model": "qwen3.6:8b","thinking": None},
}
```

### Gemini Thinking Budget — contrôle granulaire

```python
# Gemini 3 Flash : 4 niveaux de thinking configurables par call
import google.generativeai as genai

# Pour une tâche de classification simple → thinking minimal
response = model.generate_content(
    prompt,
    generation_config={"thinking_level": "MINIMAL"}  # quasi-gratuit
)

# Pour une revue d'architecture → thinking medium
response = model.generate_content(
    prompt,
    generation_config={"thinking_level": "MEDIUM"}   # qualité supérieure
)

# Le niveau s'adapte automatiquement selon le type de tâche dans AgentOS
# Économie typique vs thinking HIGH : 60-85% selon la complexité
```

### DeepSeek — caching automatique, logique inversée

```python
# Sur DeepSeek, la logique de prompt design s'inverse totalement
# Avec cache hit à $0.0028/M : les tokens d'entrée sont quasi-gratuits
# → Mettre BEAUCOUP de contexte dans le system prompt (il sera mis en cache)
# → Les exemples, les rules, le goal object → tout dans le prefix stable

DEEPSEEK_PROMPT_STRATEGY = """
# STABLE PREFIX (mis en cache automatiquement)
[system_prompt complet]        # 2000 tokens → $0.0000056 sur cache hit
[skill definitions]            # 1500 tokens
[goal object]                  # 500 tokens
[workspace config]             # 300 tokens
[persistence rules]            # 400 tokens
# Total prefix : ~4700 tokens → $0.000013 par call avec cache

# DYNAMIC SUFFIX (non-caché, change à chaque step)
[current task]                 # 200 tokens
[last tool output]             # 400 tokens
# Total dynamic : ~600 tokens → $0.000084

# Coût total par step : ~$0.0001 (pour 5300 tokens d'entrée)
# vs GPT-5.5 sans cache : $0.026 → 260x plus cher
"""
```

---

## 30. Terminal Global (Mission Control)

En plus du terminal individuel par agent, AgentOS expose un **terminal global** — une interface unifiée pour piloter toute l'équipe depuis un seul point.

### 30.1 Concept

Le terminal global est la tour de contrôle. Il n'est pas un simple agrégateur de logs — c'est une surface d'interaction active avec toute l'équipe simultanément.

```
╭─ AgentOS — Mission Control ──────────────────────────────────────────╮
│                                                                       │
│  ┌─ Director ──┐  ┌─ Maya (Dev) ─┐  ┌─ Reviewer ──┐  ┌─ QA ───────┐ │
│  │ ✓ delegated │  │ ▶ coding...  │  │ ⏳ waiting  │  │ ⏳ waiting  │ │
│  └─────────────┘  └──────────────┘  └─────────────┘  └────────────┘ │
│                                                                       │
│  [GLOBAL LOG — all agents, chronological]                            │
│  14:02 [sys]      Goal anchored — Build REST API                     │
│  14:03 [director] Delegating: Architect → design, Maya → code        │
│  14:04 [maya]     Reading architecture spec...                       │
│  14:05 [maya]     ▶ file_write → src/models/user.py                  │
│  14:06 [maya]     ▶ python_sandbox → syntax check ✓                  │
│  14:07 [reviewer] Waiting for Maya checkpoint...                     │
│                                                                       │
│  → /broadcast Prioritize the DELETE endpoint, it's blocking QA       │
│    ⌘↵ send  · /msg maya · /pause all · /kill reviewer · /status      │
╰───────────────────────────────────────────────────────────────────────╯
```

### 30.2 Commandes du terminal global

```bash
# Communication
/broadcast <message>        → envoie à tous les agents simultanément
/msg <agent_id> <message>   → message direct à un agent spécifique
/inject <context>           → injecte du contexte dans tous les contextes actifs

# Contrôle de l'exécution
/pause                      → pause tous les agents (en fin de step en cours)
/pause <agent_id>           → pause un agent spécifique
/resume                     → reprend tout
/kill <agent_id>            → kill immédiat d'un agent
/kill all                   → kill tous (checkpoint sauvegardé)
/restart <agent_id>         → redémarre un agent depuis son dernier checkpoint
/spawn <preset> <task>      → spawn un nouvel agent à la volée

# Monitoring
/status                     → vue d'ensemble de tous les agents
/cost                       → coût actuel par agent + projection
/progress                   → état des checkpoints du run
/logs <agent_id>            → bascule vers le terminal de cet agent
/logs all                   → revient au terminal global

# Configuration live
/model <agent_id> <model>   → change le modèle d'un agent en cours de run
/thinking <agent_id> <lvl>  → ajuste le thinking level (gemini)
/budget <agent_id> <$>      → modifie le budget max d'un agent
/promote <agent_id> <role>  → assigne un rôle temporaire

# Goal & workflow
/checkpoint                 → force une validation des checkpoints maintenant
/goal                       → affiche le Goal Object du run en cours
/plan                       → affiche le plan de run et son état
/gate                       → force un human-in-the-loop gate maintenant
```

### 30.3 Vue multi-agents en split-screen

Le terminal global propose plusieurs modes d'affichage :

```
MODE 1 — Global log (défaut)
  Flux chronologique de tous les agents, avec tag de source coloré

MODE 2 — Split 2x2 (ou N×M configurable)
  ┌─────────────┬─────────────┐
  │ Director    │ Maya (Dev)  │
  ├─────────────┼─────────────┤
  │ Reviewer    │ QA Agent    │
  └─────────────┴─────────────┘
  Chaque quadrant = terminal xterm.js indépendant
  Redimensionnable par drag

MODE 3 — Focus + minimap
  Un agent en plein écran + miniature des autres en sidebar

MODE 4 — Timeline view
  Axe horizontal = temps, lignes = agents, blocs = steps
  Visualisation des dépendances et du parallélisme

Raccourcis : ⌘1 / ⌘2 / ⌘3 / ⌘4 pour switcher de mode
```

### 30.4 Filtres et recherche dans le terminal global

```
Filtres rapides (toggleables) :
  [●] Director   [●] Maya   [●] Reviewer   [○] QA   [●] sys
  [●] tool calls   [●] errors   [○] debug   [●] checkpoints

Recherche full-text :
  /find "user endpoint"   → highlight toutes les occurrences dans tous les logs
  /find --agent maya "error"  → filtré par agent

Export :
  /export logs             → export JSON du run complet
  /export logs --agent maya → export log d'un agent spécifique
  /export cost             → rapport de coût détaillé
```

---

## 31. Design System TUI — Spécification visuelle complète

### 31.1 Philosophie

L'esthétique cible est **terminal-first, pas terminal-émulé**. Pas un terminal déguisé en app, pas une app déguisée en terminal. Un vrai hybride : la densité d'information et la lisibilité d'un TUI professionnel (Claude Code, lazygit, k9s), rendu dans une WebView Tauri avec xterm.js comme moteur de rendu pour les zones de streaming.

Référence principale : Claude Code. Références secondaires : lazygit, k9s, Warp terminal.

### 31.2 Palette de couleurs

```
FOND (backgrounds)
  app-bg          #0e0e0f   ← fond principal, quasi-noir
  surface-1       #111112   ← header, input bar, status bar
  surface-2       #141415   ← sidebar, panels secondaires
  surface-3       #1a1a1c   ← hover states, sélections
  surface-4       #1e1e20   ← bordures, séparateurs

TEXTE
  text-primary    #e8e6de   ← texte principal, labels actifs
  text-secondary  #c9c7be   ← texte courant dans le terminal
  text-muted      #888780   ← labels inactifs, métadonnées
  text-dim        #555550   ← timestamps, éléments très secondaires
  text-ghost      #333330   ← séparateurs texte, bg patterns

COULEURS SÉMANTIQUES (ANSI dans xterm.js)
  accent          #cc785c   ← brand AgentOS (orange terracotta)
  success         #63a355   ← ✓ validations, agents actifs, dot running
  warning         #ba9b4a   ← ⚠ warnings, agents en attente, cost alerts
  error           #cc5555   ← ✗ erreurs, kill, échecs
  info            #6a8fb5   ← roles Manager, informations système
  purple          #9a6ab5   ← rôles QA/Critic, tags spéciaux

TAGS AGENTS dans le terminal (couleurs fixes par rôle)
  [director]      #cc785c   ← accent brand
  [manager]       #6a8fb5   ← info blue
  [dev]           #63a355   ← success green
  [qa]            #9a6ab5   ← purple
  [critic]        #ba9b4a   ← warning amber
  [sys]           #555550   ← dim (events système)
  [tool]          #ba9b4a   ← amber (tool calls)
  [ok]            #63a355   ← vert (validations)
  [err]           #cc5555   ← rouge (erreurs)
  [warn]          #ba9b4a   ← amber (warnings)

STATUS BAR (fond accent)
  bg              #cc785c   ← fond orange terracotta
  text            #3a1e0e   ← texte très foncé sur fond accent
  sep             #a85e3a   ← séparateurs sur le fond accent
```

### 31.3 Typographie

```
POLICE PRINCIPALE
  Famille    : JetBrains Mono → Fira Code → Cascadia Code → monospace
  Fallback   : toute police monospace disponible
  Raison     : ligatures, lisibilité, standard terminal pro

TAILLES
  terminal body   : 12px / line-height 1.7
  labels UI       : 11-12px
  titres panel    : 13px / weight 500
  status bar      : 10px
  badges/pills    : 10px / weight 500

JAMAIS de police sans-serif dans les zones terminal
Les zones React hors-terminal (sidebar labels, tooltips) peuvent utiliser system-ui
```

### 31.4 Bordures et séparateurs

```
RÈGLE FONDAMENTALE : 1px solid, jamais plus
  panel borders     : 1px solid #1e1e20  (surface-4)
  active borders    : 1px solid #333330  (légèrement visible)
  focus borders     : 1px solid #cc785c  (accent — tab active, agent selected)
  separator lines   : border-top: 1px solid #1a1a1c

BORDURES ANSI dans le terminal (caractères Unicode)
  Panneaux        : ╭─╮ / │ / ╰─╯    (rounded, style Claude Code)
  Tables          : ┌─┬─┐ / ├─┼─┤ / └─┴─┘
  Séparateurs     : ─────────────────────
  Titres inline   : ╭─ Title ──────────╮

PAS de box-shadow, PAS de drop-shadow, PAS de blur
```

### 31.5 Composants UI (React, hors terminal)

```
SIDEBAR
  width         : 220px fixe
  bg            : surface-2 (#141415)
  border-right  : 1px solid surface-4 (#1e1e20)

  Agent row (inactif)
    height      : 32px
    padding     : 5px 14px
    color       : text-muted (#888780)
    border-left : 2px solid transparent

  Agent row (actif / sélectionné)
    bg          : surface-3 (#1a1a1c)
    color       : text-primary (#e8e6de)
    border-left : 2px solid accent (#cc785c)

  Status dot
    size        : 6px circle
    running     : #63a355 + box-shadow 0 0 4px #63a35566
    waiting     : #ba9b4a (pas de glow)
    idle        : #444
    done        : #6a8fb5

  Level badge (CEO/MGR/DEV/QA)
    font-size   : 9px
    bg          : surface-4 (#1e1e20)
    color       : text-dim (#555)
    padding     : 1px 5px
    border-radius : 2px

TOP BAR
  height        : 36px
  bg            : surface-1 (#141415)
  border-bottom : 1px solid surface-4

  Logo "◆ AgentOS"
    color       : accent (#cc785c)
    font-size   : 13px / weight 600
    letter-spacing : 0.05em

  Status badges (run/cost)
    border-radius : 3px
    font-size   : 10px / weight 500
    RUNNING     : bg #1a2e1a / color #63a355 / border #2a4a2a
    COST        : bg #1e1c14 / color #ba9b4a / border #3a3220

AGENT HEADER (au-dessus du terminal)
  height        : 36px
  bg            : surface-1 (#111112)
  border-bottom : 1px solid surface-4 (#1e1e20)
  padding       : 0 16px

  Model badge
    bg          : surface-4 (#1e1e20)
    color       : text-dim (#555)
    font-size   : 11px
    padding     : 2px 8px / border-radius : 3px

  Tool pills
    actif       : color #8aaa8a / bg #141e14 / border #2a3e2a
    inactif     : color #555 / bg transparent / border #222
    font-size   : 10px / padding : 1px 6px / border-radius : 2px

  Kill button
    color       : #7a3a3a / border : 1px solid #2e1e1e
    hover       : color #cc5555 / bg #1e1010
    font-size   : 10px

INPUT BAR (sous le terminal)
  height        : 36px
  bg            : surface-1 (#111112)
  border-top    : 1px solid surface-4

  Prefix "→"   : color accent (#cc785c)
  Input field  : bg transparent / color text-primary / font monospace 12px
  Placeholder  : color text-ghost (#333)
  Hints        : color text-dim (#555) / font-size 10px

STATUS BAR (tout en bas)
  height        : 24px
  bg            : accent (#cc785c)   ← seul élément avec fond coloré
  color         : #3a1e0e (foncé sur fond orange)
  separators    : #a85e3a
  font-size     : 10px
```

### 31.6 Conventions ANSI dans xterm.js

```
SÉQUENCES ANSI utilisées côté backend Python pour le rendu

Colors (256-color ANSI)
  accent/brand   : \x1b[38;5;173m   (orange terracotta)
  success        : \x1b[38;5;71m    (vert)
  warning        : \x1b[38;5;136m   (amber)
  error          : \x1b[38;5;167m   (rouge)
  info           : \x1b[38;5;67m    (bleu)
  dim            : \x1b[2m          (dimmed)
  bold           : \x1b[1m
  reset          : \x1b[0m

Format d'une ligne de log
  \x1b[2m14:02\x1b[0m  ← timestamp dim
  \x1b[38;5;67m[mgr]\x1b[0m  ← tag coloré selon rôle
  message normal  ← corps du message

Format d'un tool call
  \x1b[38;5;136m[tool]\x1b[0m file_write → src/api/users.py

Format d'un checkpoint validé
  \x1b[38;5;71m[✓ gate]\x1b[0m endpoints_coded — validated by Critic

Format d'une erreur
  \x1b[38;5;167m[err]\x1b[0m Tests failed: 3 errors in test_users.py

Curseur clignotant (agent en train d'écrire)
  block cursor  : color accent (#cc785c) / animation blink 1.1s step-end
```

### 31.7 Animations et micro-interactions

```
TOUT doit être subtil — jamais de flash, jamais de bounce

Status dot running
  box-shadow : 0 0 4px #63a35566
  PAS d'animation pulse (trop distrayant)

Curseur terminal
  block 8x14px / color accent / blink 1.1s step-end infinite
  visible uniquement sur l'agent actif qui stream

Agent row hover
  transition : background 0.1s ease
  PAS de slide, PAS de scale

Progress bar
  width transition : 0.3s ease sur mise à jour du pourcentage

Nouveau message dans le terminal
  PAS d'animation — le texte apparaît directement (streaming natif xterm.js)
  L'auto-scroll est la seule "animation" nécessaire

Switching de mode (global/split/focus)
  PAS de transition — switch instantané (évite la nausée sur grilles complexes)
```

### 31.8 Layout général de l'application

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR (36px)  ◆ AgentOS / workspace  [● RUNNING] [$0.42] │
├──────────────┬──────────────────────────────────────────────┤
│              │  AGENT HEADER (36px)                         │
│   SIDEBAR    │  Maya — Developer  [claude-sonnet] [tools]  │
│   (220px)    ├──────────────────────────────────────────────┤
│              │                                              │
│  ● Director  │   TERMINAL ZONE (xterm.js)                  │
│  ● Architect │   scroll indépendant par agent              │
│  ▶ Maya      │   streaming token par token                 │
│  ⏳ Reviewer  │   ANSI colors full support                  │
│  ⏳ QA Agent  │                                              │
│  ○ Writer    │                                              │
│              ├──────────────────────────────────────────────┤
│  [Progress]  │  INPUT BAR (36px)                            │
│  [Skills]    │  → message à Maya...          ⌘↵ · ⌘K · ⌘P  │
│              │                                              │
├──────────────┴──────────────────────────────────────────────┤
│  STATUS BAR (24px, fond accent)                             │
│  ◆ v0.1 │ 5 agents · 3 active │ langgraph │ local/fs │ ...  │
└─────────────────────────────────────────────────────────────┘

VUES ADDITIONNELLES (switchables via ⌘1/2/3/4)
  ⌘1 : vue ci-dessus (défaut — agent individuel focus)
  ⌘2 : split N×M (tous les terminaux visibles)
  ⌘3 : Mission Control (terminal global + commandes)
  ⌘4 : Dashboard (monitoring, coûts, timeline, métriques)
```

### 31.9 Ce qu'on n'emprunte PAS au web

```
❌ rounded corners > 4px sur les composants terminaux
❌ gradients ou shadows sur les surfaces
❌ animations > 0.3s
❌ fonts sans-serif dans les zones terminal
❌ couleurs saturées ou "fun" (sauf status dots)
❌ cards avec padding excessif
❌ modals qui bloquent la vue du terminal
❌ scroll horizontal (tout doit tenir dans la largeur)
❌ tooltips retardés (> 200ms de delay)
❌ spinner / loading states visibles (le streaming remplace tout ça)
```

*Mise à jour — 28 mai 2026*
