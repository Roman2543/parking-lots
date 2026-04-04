help:
	@echo "  make install   - Install dependencies"
	@echo "  make run       - Run app in development mode"
	@echo "  make start     - Run app in production mode (requires build)"
	@echo "  make build     - Build app"
	@echo "  make test      - Run unit tests"
	@echo "  make test-cov  - Run tests with coverage"
	@echo "  make lint      - Run lint"

install:
	yarn install

dev:
	yarn start:dev

prod:
	yarn start:prod

build:
	yarn build

test:
	yarn test

test-cov:
	yarn test:cov

lint:
	yarn lint