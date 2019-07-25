.PHONY: test
test:
	yarn jest

.PHONY: coverage
coverage:
	yarn jest --coverage

.PHONY: prettier
prettier:
	yarn prettier --write '**/*.{ts,js,json}'

.PHONY: build
build:
	rm -rf dist
	yarn tsc --project .
