export function bindNavTabs({ selector = '.nav-tab', activeClass = 'active' } = {}) {
  document.querySelectorAll(selector).forEach((tab) => {
    if (tab.dataset.tabBound === '1') return;
    tab.dataset.tabBound = '1';

    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      document.querySelectorAll(selector).forEach((t) => t.classList.remove(activeClass));
      tab.classList.add(activeClass);
      document.querySelectorAll('.nav-content').forEach((c) => c.classList.remove(activeClass));
      const target = document.querySelector(`.nav-content[data-tab="${tabName}"]`);
      if (target) target.classList.add(activeClass);
    });
  });
}
