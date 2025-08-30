import { getContext, setContext } from 'svelte';
import type { RepositoryContext } from '../data/types';

const CONTEXT_KEY = Symbol('repository-context');

export function setRepositoryContext(context: RepositoryContext) {
  setContext(CONTEXT_KEY, context);
}

export function getRepositoryContext(): RepositoryContext {
  return getContext(CONTEXT_KEY) || {
    chapterId: undefined,
    bookId: undefined,
    shelfId: undefined
  };
}

export function createRepositoryContext(initial: RepositoryContext = {}) {
  let value = $state<RepositoryContext>(initial);
  
  return {
    get value() {
      return value;
    },
    update(newContext: Partial<RepositoryContext>) {
      value = { ...value, ...newContext };
    },
    set(newContext: RepositoryContext) {
      value = newContext;
    }
  };
}