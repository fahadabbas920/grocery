# Variables
PNPM := pnpm
TURBO := $(PNPM) turbo
NODE_MAJOR := 20

# Colors for prettier output
CYAN := \033[36m
RESET := \033[0m

.PHONY: help install clean build dev lint typecheck format check-node-version \
	dev-ops dev-shop dev-rider build-ops build-shop build-web build-packages \
	start-ops start-shop rider-apk deploy-shop deploy-ops \
	db-push db-types db-lint db-reset functions-deploy ci-build

# Default target
help:
	@echo "$(CYAN)Grocery Delivery Platform - Build Commands$(RESET)"
	@echo "Available commands:"
	@echo "  make install          - Install all dependencies"
	@echo "  make build            - Build all applications and packages"
	@echo "  make dev              - Start all development servers"
	@echo "  make lint             - Run linting across the monorepo"
	@echo "  make typecheck        - Type-check all workspaces"
	@echo "  make format           - Format with Prettier"
	@echo "  make clean            - Clean build artifacts and node_modules"
	@echo "  make check-version    - Check Node.js version"
	@echo ""
	@echo "$(CYAN)Per-app dev:$(RESET)"
	@echo "  make dev-ops          - Ops Console (Next.js, :3001)"
	@echo "  make dev-shop         - Customer PWA (Next.js, :3000)"
	@echo "  make dev-rider        - Rider app (Expo)"
	@echo ""
	@echo "$(CYAN)Supabase:$(RESET)"
	@echo "  make db-push          - Apply migrations to the linked project"
	@echo "  make db-types         - Regenerate packages/db types from the linked project"
	@echo "  make db-lint          - Lint SQL migrations"
	@echo "  make db-reset         - Reset the local database"
	@echo "  make functions-deploy - Deploy all edge functions"
	@echo ""
	@echo "$(CYAN)Deploy (Vercel):$(RESET)"
	@echo "  make deploy-shop      - Build Customer PWA (used by Vercel CI)"
	@echo "  make deploy-ops       - Build Ops Console (used by Vercel CI)"
	@echo ""
	@echo "$(CYAN)Release:$(RESET)"
	@echo "  make rider-apk        - Build the Rider Android APK via EAS"

# Check Node version (major >= NODE_MAJOR)
check-node-version:
	@echo "$(CYAN)Checking Node.js version...$(RESET)"
	@MAJOR=$$(node -v | sed 's/v\([0-9]*\).*/\1/'); \
		[ "$$MAJOR" -ge "$(NODE_MAJOR)" ] || \
		(echo "Node.js v$(NODE_MAJOR)+ is required (found $$(node -v)). Use nvm to switch versions." && exit 1)

# Install dependencies (root level — pnpm workspaces)
install: check-node-version
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	$(PNPM) install

# Clean build artifacts and dependencies
clean:
	@echo "$(CYAN)Cleaning project...$(RESET)"
	rm -rf node_modules
	rm -rf .turbo
	rm -rf apps/*/.next
	rm -rf apps/*/dist
	rm -rf apps/*/.expo
	rm -rf apps/*/.turbo
	rm -rf apps/*/node_modules
	rm -rf packages/*/dist
	rm -rf packages/*/.turbo
	rm -rf packages/*/node_modules

# -------- Build --------
build: install
	@echo "$(CYAN)Building all applications...$(RESET)"
	$(TURBO) run build

build-ops: install
	@echo "$(CYAN)Building Ops Console...$(RESET)"
	$(TURBO) run build --filter=@grocery/ops...

build-shop: install
	@echo "$(CYAN)Building Customer PWA...$(RESET)"
	$(TURBO) run build --filter=@grocery/shop...

build-web: install
	@echo "$(CYAN)Building web apps (ops + shop)...$(RESET)"
	$(TURBO) run build --filter=@grocery/ops... --filter=@grocery/shop...

build-packages: install
	@echo "$(CYAN)Building shared packages...$(RESET)"
	$(TURBO) run build --filter='./packages/*'

# -------- Quality --------
lint: install
	@echo "$(CYAN)Linting...$(RESET)"
	$(TURBO) run lint

typecheck: install
	@echo "$(CYAN)Type-checking...$(RESET)"
	$(TURBO) run typecheck

format:
	@echo "$(CYAN)Formatting...$(RESET)"
	$(PNPM) format

# -------- Development --------
dev: install
	@echo "$(CYAN)Starting all development servers...$(RESET)"
	$(TURBO) run dev --ui=tui

dev-ops: install
	@echo "$(CYAN)Starting Ops Console (:3001)...$(RESET)"
	$(PNPM) -F @grocery/ops dev

dev-shop: install
	@echo "$(CYAN)Starting Customer PWA (:3000)...$(RESET)"
	$(PNPM) -F @grocery/shop dev

dev-rider: install
	@echo "$(CYAN)Starting Rider app (Expo)...$(RESET)"
	$(PNPM) -F @grocery/rider dev

# -------- Production start (web) --------
start-ops:
	@echo "$(CYAN)Starting Ops Console...$(RESET)"
	$(PNPM) -F @grocery/ops start

start-shop:
	@echo "$(CYAN)Starting Customer PWA...$(RESET)"
	$(PNPM) -F @grocery/shop start

# -------- Supabase --------
db-push:
	@echo "$(CYAN)Pushing migrations to the linked Supabase project...$(RESET)"
	$(PNPM) db:push

db-types:
	@echo "$(CYAN)Regenerating database types...$(RESET)"
	$(PNPM) db:types

db-lint:
	@echo "$(CYAN)Linting SQL migrations...$(RESET)"
	$(PNPM) db:lint

db-reset:
	@echo "$(CYAN)Resetting the local database...$(RESET)"
	$(PNPM) db:reset

functions-deploy:
	@echo "$(CYAN)Deploying edge functions...$(RESET)"
	supabase functions deploy on-order-assigned
	supabase functions deploy cleanup-product-image

# -------- Deploy (used by Vercel — no install step, Vercel handles that) --------
deploy-shop:
	@echo "$(CYAN)Building Customer PWA for deployment...$(RESET)"
	$(TURBO) run build --filter=@grocery/shop...

deploy-ops:
	@echo "$(CYAN)Building Ops Console for deployment...$(RESET)"
	$(TURBO) run build --filter=@grocery/ops...

# -------- Release --------
rider-apk: install
	@echo "$(CYAN)Building Rider Android APK via EAS...$(RESET)"
	$(PNPM) -F @grocery/rider build:apk

# -------- CI --------
ci-build: check-node-version
	@echo "$(CYAN)Running CI build...$(RESET)"
	$(PNPM) install --frozen-lockfile
	$(TURBO) run typecheck build
