export function bindNavTabs({ selector = '.nav-tab', activeClass = 'active' } = {}) {
  const tabs = Array.from(document.querySelectorAll(selector));

  const select = (tab) => {
    const tabName = tab.dataset.tab;
    tabs.forEach((t) => {
      const isActive = t === tab;
      t.classList.toggle(activeClass, isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      t.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    document.querySelectorAll('.nav-content').forEach((c) => c.classList.remove(activeClass));
    const target = document.querySelector(`.nav-content[data-tab="${tabName}"]`);
    if (target) target.classList.add(activeClass);
  };

  tabs.forEach((tab, i) => {
    if (tab.dataset.tabBound === '1') return;
    tab.dataset.tabBound = '1';
    if (!tab.hasAttribute('tabindex')) {
      tab.setAttribute('tabindex', tab.classList.contains(activeClass) ? '0' : '-1');
    }

    tab.addEventListener('click', () => select(tab));

    tab.addEventListener('keydown', (e) => {
      let nextIndex = null;
      if (e.key === 'ArrowRight') nextIndex = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') nextIndex = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') nextIndex = 0;
      else if (e.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex !== null) {
        e.preventDefault();
        const next = tabs[nextIndex];
        select(next);
        next.focus();
      }
    });
  });
}
