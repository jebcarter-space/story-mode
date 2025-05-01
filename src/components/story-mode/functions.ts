import { content } from '../../App.svelte';
import { oracle } from '../../data/tables';
import type { ContentData } from '../../data/types';
import { getRandomKeywords } from '../../lib/keywords';
import { rollOnTable } from '../../lib/tables';
import { input } from './Input.svelte';

export function addInput() {
  const userInput: ContentData = {
    type: 'input',
    output: input.value,
  };

  content.add(userInput);

  input.reset();
}

export function getAnswer() {
  let isAndOrBut = false;
  let keywords: string[] = [];

  const result = rollOnTable(oracle);
  const answer = result.description;
  if (
    answer.includes('and') ||
    answer.includes('but')
  ) {
    isAndOrBut = true;
    keywords = [...getRandomKeywords()];
  }

  const output =
    `<strong>${answer}</strong>` +
    ` <small><em>(${result.roll})</em></small>` +
    `${isAndOrBut ? `<br/>${keywords.join(', ')}` : ''}` +
    ``;

  const string: ContentData = {
    output,
    type: 'oracle',
    input: `<strong>Q:</strong> ${input.value}`,
  };

  content.add([ string ]);

  input.reset();
}