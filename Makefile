check:
	npm test

.PHONY: push

push:
	@bash scripts/push.sh "$(MSG)"
