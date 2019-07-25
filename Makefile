.PHONY: test
test:
	yarn jest

ci:
	yarn prettier --check '**/*.{ts,js,json}'
	make coverage

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

.PHONY: publish
publish: build
	yarn np
