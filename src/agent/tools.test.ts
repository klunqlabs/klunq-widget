// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { browserTools } from './tools';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const readPageCode = browserTools.find((t) => t.name === 'read_page_code')!;
const readPageContent = browserTools.find((t) => t.name === 'read_page_content')!;
const clickElement = browserTools.find((t) => t.name === 'click_element')!;
const setFieldValue = browserTools.find((t) => t.name === 'set_field_value')!;
const followLink = browserTools.find((t) => t.name === 'follow_link')!;

describe('read_page_code', () => {
  it('returns body innerHTML', async () => {
    const innerHTML = '<div id="test">hello</div>'
    document.body.innerHTML = innerHTML;
    const result = await readPageCode.invoke({});
    expect(result).toContain(innerHTML);
  });
});

describe('read_page_content', () => {
  it('reads entire page when no selector given', async () => {
    document.body.innerHTML = '<p>Hello world</p>';
    const result = await readPageContent.invoke({});
    expect(result).toBe('Hello world');
  });

  it('reads content from a specific selector', async () => {
    document.body.innerHTML = '<div id="main"><p>Section content</p></div><aside>Ignored</aside>';
    const result = await readPageContent.invoke({ selector: '#main' });
    expect(result).toBe('Section content');
  });

  it('returns "Element not found" for missing selector', async () => {
    const result = await readPageContent.invoke({ selector: '#missing' });
    expect(result).toBe('Element not found: #missing');
  });
});

describe('click_element', () => {
  function trackClicks(html: string): {
    btn: HTMLButtonElement;
    spy: Mock;
  } {
    document.body.innerHTML = html;
    const btn = document.body.querySelector('button')!;
    const spy = vi.fn();
    btn.addEventListener('click', spy);
    return { btn, spy };
  }

  it('dispatches click event on element found by CSS selector', async () => {
    const { spy } = trackClicks('<button id="btn-1">Click me</button>');
    await clickElement.invoke({ query: '#btn-1' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('dispatches click event on element found by text fallback', async () => {
    const { spy } = trackClicks('<button>Submit form</button>');
    await clickElement.invoke({ query: 'Submit' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns not-found message for non-existent element', async () => {
    const result = await clickElement.invoke({ query: 'nonexistent-element' });
    expect(result).toContain('Could not find');
  });
});

describe('set_field_value', () => {
  it('sets text input value', async () => {
    document.body.innerHTML = '<input id="name" />';
    const result = await setFieldValue.invoke({ query: '#name', value: 'John' });
    expect(result).toBe('Set to: John');
    const input = document.getElementById('name') as HTMLInputElement;
    expect(input.value).toBe('John');
  });

  it('checks a checkbox', async () => {
    document.body.innerHTML = '<input type="checkbox" id="agree" />';
    const result = await setFieldValue.invoke({ query: '#agree', value: true });
    expect(result).toBe('Set to: true');
    const cb = document.getElementById('agree') as HTMLInputElement;
    expect(cb.checked).toBe(true);
  });

  it('returns not-found for missing input', async () => {
    const result = await setFieldValue.invoke({ query: '#missing', value: 'x' });
    expect(result).toContain('Could not find');
  });
});

describe('follow_link', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('navigates to href found by CSS selector', async () => {
    document.body.innerHTML = '<a id="my-link" href="/page">Go there</a>';
    const result = await followLink.invoke({ query: '#my-link' });
    expect(result).toBe('Navigated to: /page');
    expect(window.open).toHaveBeenCalledWith('/page', '_blank', 'noopener, noreferrer');
  });

  it('navigates to href found by link text', async () => {
    document.body.innerHTML = '<a href="/docs">Documentation</a>';
    const result = await followLink.invoke({ query: 'Documentation' });
    expect(result).toBe('Navigated to: /docs');
    expect(window.open).toHaveBeenCalledWith('/docs', '_blank', 'noopener, noreferrer');
  });

  it('navigates to href found by href content', async () => {
    document.body.innerHTML = '<a href="/pricing">See plans</a>';
    const result = await followLink.invoke({ query: 'pricing' });
    expect(result).toBe('Navigated to: /pricing');
    expect(window.open).toHaveBeenCalledWith('/pricing', '_blank', 'noopener, noreferrer');
  });

  it('returns not-found message for missing link', async () => {
    const result = await followLink.invoke({ query: 'nonexistent' });
    expect(result).toContain('Could not find a link');
  });

  it('returns no-href message when link lacks href', async () => {
    document.body.innerHTML = '<a id="broken">No href</a>';
    const result = await followLink.invoke({ query: '#broken' });
    expect(result).toContain('has no href attribute');
  });
});
