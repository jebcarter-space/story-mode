import type { Workbook, Stack, WorkbookSystem } from "../types";

export function createWorkbooks() {
  let value = $state<WorkbookSystem>(JSON.parse(localStorage.getItem('workbooks') || '{"stacks":{}}'));

  function save() {
    localStorage.setItem('workbooks', JSON.stringify(value));
  }

  function reset() {
    value = { stacks: {} };
    save();
  }

  function createStack(name: string): string {
    const stackId = `stack_${Date.now()}`;
    const stack: Stack = {
      id: stackId,
      name,
      workbooks: {}
    };
    
    value.stacks[stackId] = stack;
    save();
    return stackId;
  }

  function deleteStack(stackId: string) {
    delete value.stacks[stackId];
    save();
  }

  function createWorkbook(
    stackId: string, 
    name: string, 
    description?: string,
    tags: string[] = [],
    masterScope?: 'chapter' | 'book' | 'shelf' | 'library',
    masterScopeContext?: { chapterId?: string; bookId?: string; shelfId?: string }
  ): string {
    const workbookId = `workbook_${Date.now()}`;
    const workbook: Workbook = {
      id: workbookId,
      name,
      description,
      stackId,
      masterScope,
      masterScopeContext,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (value.stacks[stackId]) {
      value.stacks[stackId].workbooks[workbookId] = workbook;
      save();
    }
    
    return workbookId;
  }

  function updateWorkbook(stackId: string, workbookId: string, updates: Partial<Workbook>) {
    if (value.stacks[stackId]?.workbooks[workbookId]) {
      value.stacks[stackId].workbooks[workbookId] = {
        ...value.stacks[stackId].workbooks[workbookId],
        ...updates,
        updatedAt: Date.now()
      };
      save();
    }
  }

  function deleteWorkbook(stackId: string, workbookId: string) {
    if (value.stacks[stackId]?.workbooks[workbookId]) {
      delete value.stacks[stackId].workbooks[workbookId];
      save();
    }
  }

  function getWorkbooksByTag(tag: string): Workbook[] {
    const workbooks: Workbook[] = [];
    for (const stack of Object.values(value.stacks)) {
      for (const workbook of Object.values(stack.workbooks)) {
        if (workbook.tags.includes(tag)) {
          workbooks.push(workbook);
        }
      }
    }
    return workbooks;
  }

  function getAllWorkbooks(): Workbook[] {
    const workbooks: Workbook[] = [];
    for (const stack of Object.values(value.stacks)) {
      for (const workbook of Object.values(stack.workbooks)) {
        workbooks.push(workbook);
      }
    }
    return workbooks;
  }

  function getAllTags(): string[] {
    const tags = new Set<string>();
    for (const stack of Object.values(value.stacks)) {
      for (const workbook of Object.values(stack.workbooks)) {
        workbook.tags.forEach(tag => tags.add(tag));
      }
    }
    return Array.from(tags).sort();
  }

  // Auto-create default workbook when shelf is created
  function createDefaultWorkbook(shelfId: string, shelfName: string): string {
    // Check if a stack for this shelf already exists
    const existingStack = Object.values(value.stacks).find(
      stack => stack.name === `${shelfName} Stacks`
    );
    
    let stackId: string;
    if (existingStack) {
      stackId = existingStack.id;
    } else {
      stackId = createStack(`${shelfName} Stacks`);
    }

    // Create default workbook for this shelf
    return createWorkbook(
      stackId,
      `${shelfName} Workbook`,
      `Default workbook for ${shelfName} shelf`,
      ['default'],
      'shelf',
      { shelfId }
    );
  }

  function reload() {
    value = JSON.parse(localStorage.getItem('workbooks') || '{"stacks":{}}');
  }

  return {
    get value() {
      return value;
    },
    save,
    reset,
    createStack,
    deleteStack,
    createWorkbook,
    updateWorkbook,
    deleteWorkbook,
    getWorkbooksByTag,
    getAllWorkbooks,
    getAllTags,
    createDefaultWorkbook,
    reload
  };
}