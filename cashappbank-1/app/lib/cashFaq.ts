/**
 * FAQ accordion — re-implementation of the original `GalleryFaqItem` +
 * `GalleryFaqQuestions` pair.
 *
 * Recovered parent logic:
 *
 *     onClick: () => { logEvent({faqIdentifier}); setActive(isActive ? null : id) }
 *     active: activeId === id
 *
 * so it is a **single-open** accordion, and clicking the open item closes it.
 *
 * Recovered item markup (all three get the `active` class):
 *
 *     <a class="question {active}" aria-controls="answer_x" id="question_x" tabindex="0">
 *       <h3>…</h3><div class="plusSign {active}"></div>
 *     </a>
 *     <div class="answer {active}" aria-hidden={!active} aria-labelledby="question_x"
 *          id="answer_x" tabindex={active ? 0 : -1}>
 *
 * The item also scrolls itself into view when it becomes active:
 *
 *     useEffect(() => { if (active) ref.scrollIntoView({block:'start',behavior:'smooth'}) }, [active])
 *
 * That is genuine upstream behaviour, so it is reproduced here.
 *
 * State classes are derived from each element's own CSS-module prefix (see
 * `cssModules.ts`), so no build hash is hardcoded.
 */

import { siblingClass, toggleSibling } from './cssModules';
import type { EffectInit, Teardown } from './runtime';

const WIRED_ATTR = 'data-replica-faq-wired';

interface FaqItem {
  root: HTMLElement;
  question: HTMLElement;
  answer: HTMLElement;
  plusSign: HTMLElement | null;
}

function setActive(item: FaqItem, active: boolean): void {
  toggleSibling(item.question, 'question', 'active', active);
  toggleSibling(item.answer, 'answer', 'active', active);
  if (item.plusSign) toggleSibling(item.plusSign, 'plusSign', 'active', active);

  item.answer.setAttribute('aria-hidden', active ? 'false' : 'true');
  item.answer.setAttribute('tabindex', active ? '0' : '-1');
}

export const initCashFaq: EffectInit = (root: ParentNode = document): Teardown | void => {
  const questions = Array.from(root.querySelectorAll<HTMLElement>('[class*="__question"]'));
  if (!questions.length) return;

  const items: FaqItem[] = [];
  for (const question of questions) {
    // The FAQ item root is the nearest ancestor carrying `galleryFaqItem`.
    const itemRoot = question.closest<HTMLElement>('[class*="__galleryFaqItem"]');
    if (!itemRoot) continue;
    const answer = itemRoot.querySelector<HTMLElement>('[class*="__answer"]');
    if (!answer) continue;
    items.push({
      root: itemRoot,
      question,
      answer,
      plusSign: itemRoot.querySelector<HTMLElement>('[class*="__plusSign"]'),
    });
  }
  if (!items.length) return;

  const teardowns: Teardown[] = [];
  let activeIndex = -1;

  // Establish the closed baseline (the capture ships every item closed).
  items.forEach((item) => {
    const activeCls = siblingClass(item.answer, 'answer', 'active');
    if (activeCls && item.answer.classList.contains(activeCls)) {
      // Respect a pre-opened item if the capture ever contains one.
      activeIndex = items.indexOf(item);
    }
    setActive(item, items.indexOf(item) === activeIndex);
  });

  items.forEach((item, index) => {
    if (item.root.getAttribute(WIRED_ATTR) === '1') return;
    item.root.setAttribute(WIRED_ATTR, '1');

    const activate = () => {
      const willOpen = activeIndex !== index;
      // Single-open: close whatever was open first.
      if (activeIndex >= 0 && activeIndex !== index) setActive(items[activeIndex], false);
      activeIndex = willOpen ? index : -1;
      setActive(item, willOpen);

      if (willOpen) {
        item.root.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    };

    const onClick = (event: Event) => {
      // The trigger is an <a> with no href, so this only suppresses focus jank.
      event.preventDefault();
      activate();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // The original listens for `code === 'Enter'` via onKeyPress.
      if (event.code === 'Enter' || event.key === 'Enter') {
        event.preventDefault();
        activate();
      }
    };

    item.question.addEventListener('click', onClick);
    item.question.addEventListener('keydown', onKeyDown);
    teardowns.push(() => {
      item.question.removeEventListener('click', onClick);
      item.question.removeEventListener('keydown', onKeyDown);
      item.root.removeAttribute(WIRED_ATTR);
    });
  });

  if (!teardowns.length) return;
  return () => {
    for (const t of teardowns) t();
  };
};
