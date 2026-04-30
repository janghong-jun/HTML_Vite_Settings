'use strict';

// 윈도우 사이즈 체크
const windowSize = {
  winSize: null,
  breakPoint: 1024,

  setWinSize() {
    this.winSize = window.innerWidth >= this.breakPoint ? 'pc' : 'mob';
  },

  getWinSize() {
    return this.winSize;
  },
};

// 스크롤 방향 체크
const scrollManager = {
  _scrollY: 0,
  _scrollH: 0,
  _lastScrollY: 0,

  updateScrollValues() {
    this._scrollY = window.scrollY;
    this._scrollH = document.body.scrollHeight;
  },

  handleScrollDirection() {
    const $wrap = document.querySelector('#wrap');
    if ($wrap) {
      const _conOffsetTop = document.querySelector('#container').offsetTop;
      const _scrollY = window.scrollY;
      const _scrollDown = _scrollY > this._lastScrollY;
      const _scrollUp = _scrollY < this._lastScrollY;

      if (_scrollY > _conOffsetTop + 50 && _scrollDown) {
        $wrap.classList.add('scroll-down');
        $wrap.classList.remove('scroll-up');
      } else if (_scrollY > _conOffsetTop + 50 && _scrollUp) {
        $wrap.classList.add('scroll-up');
        $wrap.classList.remove('scroll-down');
      } else {
        $wrap.classList.remove('scroll-down', 'scroll-up');
      }

      this._lastScrollY = _scrollY;
    }
  },

  getscrollY() {
    return this._scrollY;
  },

  getScrollH() {
    return this._scrollH;
  },
};

// common
const common = {
  _focusTrapMap: new WeakMap(),

  focusTrap(trap) {
    if (this._focusTrapMap.has(trap)) {
      const prev = this._focusTrapMap.get(trap);
      document.removeEventListener('keydown', prev.handler);
      this._removeiframeKeyHandlers(trap, prev.iframeHandlers);
      this._focusTrapMap.delete(trap);
    }

    const getFocusableElements = () => Array.from(trap.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]):not(.krds-iframe-sentinel), iframe')).filter((el) => !el.closest('[inert]') && !el.closest('[hidden]'));

    // ── Tab / Shift+Tab 트랩 ───────────────────────────────────────
    const handler = (event) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (!focusableElements.length) return;

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === firstEl || active === trap) {
          event.preventDefault();
          lastEl.focus();
        }
      } else {
        if (active === lastEl) {
          event.preventDefault();
          firstEl.focus();
        }
      }
    };

    const iframeHandlers = this._attachIframeKeyHandlers(trap);

    this._focusTrapMap.set(trap, { handler, iframeHandlers });
    document.addEventListener('keydown', handler);
  },

  _attachIframeKeyHandlers(trap) {
    const windowBlurHandler = () => {
      setTimeout(() => {
        const iframes = Array.from(trap.querySelectorAll('iframe'));
        const focusedIframe = iframes.find((f) => document.activeElement === f);
        if (!focusedIframe) return;

        try {
          const iframeWin = focusedIframe.contentWindow;
          if (focusedIframe._krdsKeyHandler) {
            iframeWin.removeEventListener('keydown', focusedIframe._krdsKeyHandler);
          }
          focusedIframe._krdsKeyHandler = (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
              const modal = trap.closest('.krds-modal');
              if (modal) {
                krds_modal.closeModal(modal.id);
              }
            }
            if (e.key === 'Tab' && e.shiftKey) {
              e.preventDefault();
              const focusableElements = Array.from(trap.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([[type="hidden"]]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), iframe')).filter((el) => !el.closest('[inert]') && !el.closest('[hidden]'));
              const idx = focusableElements.indexOf(focusedIframe);
              if (idx <= 0) {
                focusableElements[focusableElements.length - 1].focus();
              } else {
                focusableElements[idx - 1].focus();
              }
            }
          };
          iframeWin.addEventListener('keydown', focusedIframe._krdsKeyHandler);
        } catch (e) {}
      }, 0);
    };

    window.addEventListener('blur', windowBlurHandler);
    return { windowBlurHandler };
  },

  _removeiframeKeyHandlers(trap, { windowBlurHandler } = {}) {
    if (windowBlurHandler) {
      window.removeEventListener('blur', windowBlurHandler);
    }
    trap?.querySelectorAll('iframe').forEach((iframe) => {
      if (iframe._krdsKeyHandler) {
        try {
          iframe.contentWindow.removeEventListener('keydown', iframe._krdsKeyHandler);
        } catch (e) {}
        delete iframe._krdsKeyHandler;
      }
    });
  },

  /**
   * focusTrap 해제 - 모달 닫힐 때 호출
   */
  focusTrapRemove(trap) {
    if (this._focusTrapMap.has(trap)) {
      const { handler, iframeHandlers } = this._focusTrapMap.get(trap);
      document.removeEventListener('keydown', handler);
      this._removeiframeKeyHandlers(trap, iframeHandlers);
      this._focusTrapMap.delete(trap);
    }
  },
};

/*** * krds_mainMenuPC * ***/
const krds_mainMenuPC = {
  _initialized: false,
  init() {
    if (this._initialized) return;
    const gnbMenu = document.querySelector('.krds-main-menu .gnb-menu');

    if (!gnbMenu) return;

    // gnb 속성설정
    gnbMenu.setAttribute('aria-label', '메인 메뉴');

    // dimed 요소를 설정, 기존 dimed가 없을 경우 생성
    this.backdrop = document.querySelector('.gnb-backdrop') || this.createBackdrop();

    // 주 메뉴 및 서브 메뉴의 트리거를 설정하고, 각 트리거에 이벤트를 연결
    const mainTriggers = gnbMenu.querySelectorAll('.gnb-main-trigger');
    const subTriggers = gnbMenu.querySelectorAll('.gnb-sub-trigger:not(.is-link)');
    mainTriggers.forEach((mainTrigger) => this.setupMainTrigger(mainTrigger));
    this.attachEvents(mainTriggers, subTriggers);
    this.setupKeyboardNavigation(mainTriggers);
    this._initialized = true;
  },
  setupMainTrigger(mainTrigger) {
    if (mainTrigger.hasAttribute('aria-controls')) return;
    const toggleWrap = mainTrigger.nextElementSibling;
    if (toggleWrap) {
      const uniqueIdx = `gnb-main-menu-${Math.random().toString(36).substring(2, 9)}`;
      mainTrigger.setAttribute('aria-controls', uniqueIdx);
      mainTrigger.setAttribute('aria-expanded', 'false');
      mainTrigger.setAttribute('aria-haspopup', 'true');
      toggleWrap.setAttribute('id', uniqueIdx);

      // 하위 메뉴 설정
      const mainList = toggleWrap.querySelector('.gnb-main-list');
      if (mainList?.getAttribute('data-has-submenu') === 'true') {
        const subTriggers = mainList.querySelectorAll('.gnb-sub-trigger');
        subTriggers.forEach((subTrigger) => this.setupSubTrigger(subTrigger));
        if (subTriggers.length > 0 && !subTriggers[0].classList.contains('is-link')) {
          subTriggers[0].classList.add('active');
          subTriggers[0].setAttribute('aria-expanded', 'true');
          subTriggers[0].nextElementSibling?.classList.add('active');
        }
      }
    }
  },
  setupSubTrigger(subTrigger) {
    if (subTrigger.hasAttribute('aria-controls')) return;
    const hasMenu = subTrigger.nextElementSibling;
    if (hasMenu) {
      const uniqueIdx = `gnb-sub-menu-${Math.random().toString(36).substring(2, 9)}`;
      subTrigger.setAttribute('aria-controls', uniqueIdx);
      subTrigger.setAttribute('aria-expanded', 'false');
      subTrigger.setAttribute('aria-haspopup', 'true');
      hasMenu.setAttribute('id', uniqueIdx);
    }
  },
  toggleMainMenu(mainTrigger) {
    const isActive = mainTrigger.classList.contains('active');
    const isDropDown = mainTrigger.classList.contains('is-dropdown');
    if (!isActive && mainTrigger.nextElementSibling) {
      this.resetMainMenu();
      mainTrigger.setAttribute('aria-expanded', 'true');
      mainTrigger.classList.add('active');
      mainTrigger.nextElementSibling.classList.add('is-open');
      if (!isDropDown) {
        this.toggleBackdrop(true);
        this.toggleScrollbar(true);
        this.adjustSubMenuHeight(mainTrigger.nextElementSibling.querySelector('.gnb-main-list'));
      }
    } else {
      this.closeMainMenu();
    }
  },
  toggleSubMenu(subTrigger) {
    const otherSubTriggers = subTrigger.closest('ul').querySelectorAll('.gnb-sub-trigger:not(.is-link)');
    otherSubTriggers.forEach((trigger) => {
      trigger.classList.remove('active');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.nextElementSibling?.classList.remove('active');
    });
    subTrigger.classList.add('active');
    subTrigger.setAttribute('aria-expanded', 'true');
    subTrigger.nextElementSibling?.classList.add('active');
    this.adjustSubMenuHeight(subTrigger.closest('.gnb-main-list'));
  },
  createBackdrop() {
    const backdrop = document.createElement('div');
    backdrop.classList.add('gnb-backdrop');
    document.body.appendChild(backdrop);
    // backdrop.style.display = "none";
    return backdrop;
  },
  toggleBackdrop(isOpen) {
    this.backdrop?.classList.toggle('active', isOpen);
    document.body.classList.toggle('is-gnb-web', isOpen);
    // this.backdrop.style.display = isOpen ? "block" : "none";
  },
  adjustSubMenuHeight(target) {
    // 서브 메뉴 높이를 활성 메뉴에 맞춰 조정
    const activeSubList = target.querySelector('.gnb-sub-list.active');
    const height = activeSubList?.scrollHeight || 0;
    target.style.minHeight = `${height}px`;
  },
  toggleScrollbar(isEnabled) {
    const isScrollNeeded = document.body.scrollHeight > window.innerHeight;
    document.body.classList.toggle('hasScrollY', isEnabled && isScrollNeeded);
  },
  resetMainMenu() {
    document.querySelectorAll('.krds-main-menu .gnb-main-trigger:not(.is-link)').forEach((mainTrigger) => {
      mainTrigger.classList.remove('active');
      mainTrigger.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.krds-main-menu .gnb-toggle-wrap').forEach((toggleWrap) => {
      toggleWrap.classList.remove('is-open');
    });
  },
  closeMainMenu() {
    this.resetMainMenu();
    this.toggleBackdrop(false);
    this.toggleScrollbar(false);
  },
  attachEvents(mainTriggers, subTriggers) {
    // krds-main-menu 외부 클릭시 닫기
    document.addEventListener('click', ({ target }) => {
      if (document.querySelector('.krds-modal.in')) {
        return;
      }
      if (target.closest('.krds-main-menu') || target.closest('.krds-modal')) return;
      this.closeMainMenu();
    });

    // 백드롭 클릭 시 메뉴 닫기
    // this.backdrop.addEventListener("click", () => this.closeMainMenu());

    // ESC 키를 눌러 메뉴를 닫거나, 모달/메뉴 외부에서 키 입력이 발생하면 메뉴 닫기
    document.addEventListener('keyup', (event) => {
      if (document.querySelector('.krds-modal.in')) {
        return;
      }
      if (event.code === 'Escape') {
        this.closeMainMenu();
        return;
      }
      if (event.target.closest('.krds-main-menu') || event.target.closest('.krds-modal')) return;
      this.closeMainMenu();
    });

    // 메인 메뉴 트리거 설정
    mainTriggers.forEach((mainTrigger) => {
      mainTrigger.addEventListener('click', () => this.toggleMainMenu(mainTrigger));
    });

    // 서브 메뉴 트리거 설정
    subTriggers.forEach((subTrigger) => {
      subTrigger.addEventListener('click', () => this.toggleSubMenu(subTrigger));
    });
  },
  setupKeyboardNavigation(mainTriggers) {
    const focusMenuItem = (element) => {
      if (element) {
        element.focus();
      }
    };
    const findFocusableElement = (element, direction) => {
      const sibling = direction === 'next' ? 'nextElementSibling' : 'previousElementSibling';
      const parent = element.closest('li')?.[sibling];
      return parent ? parent.querySelector('[data-trigger]') : null;
    };
    // Home, End, 방향키를 통해 메뉴 항목 간의 이동을 처리
    document.addEventListener('keydown', (event) => {
      const target = event.target;
      if (target.getAttribute('data-trigger')) {
        switch (event.key) {
          case 'Home':
            event.preventDefault();
            focusMenuItem(mainTriggers[0]);
            break;
          case 'End':
            event.preventDefault();
            focusMenuItem(mainTriggers[mainTriggers.length - 1]);
            break;
          case 'ArrowRight':
          case 'ArrowDown':
            event.preventDefault();
            const nextElement = findFocusableElement(target, 'next');
            focusMenuItem(nextElement);
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            event.preventDefault();
            const previousElement = findFocusableElement(target, 'prev');
            focusMenuItem(previousElement);
            break;
          default:
            break;
        }
      }
    });
  },
};

/*** * krds_mainMenuMobile * ***/
const krds_mainMenuMobile = {
  init() {
    const mobileGnb = document.querySelector('.krds-main-menu-mobile');

    if (!mobileGnb) return;

    if (mobileGnb.classList.contains('is-open')) {
      this.openMainMenu(mobileGnb);
    } else {
      mobileGnb.style.display = 'none';
    }

    // gnb 외부 클릭 처리
    mobileGnb.addEventListener('click', (event) => {
      if (!event.target.closest('.gnb-wrap')) {
        mobileGnb.querySelector('.gnb-wrap').focus();
      }
    });

    // 접근성 설정(tab)
    this.setupAriaAttributes(mobileGnb);

    this.attachEvents(mobileGnb);
  },
  setupAriaAttributes(mobileGnb) {
    const tabList = mobileGnb.querySelector('.menu-wrap');
    if (tabList) {
      tabList.querySelector('.menu-wrap ul').setAttribute('role', 'tablist');
      tabList.querySelectorAll('.menu-wrap li').forEach((li) => li.setAttribute('role', 'none'));

      const tabs = document.querySelectorAll('.menu-wrap .gnb-main-trigger');
      tabs.forEach((item, idx) => {
        item.setAttribute('role', 'tab');
        item.setAttribute('aria-selected', 'false');
        item.setAttribute('aria-controls', item.getAttribute('href').substring(1));
        item.setAttribute('id', `tab-${idx}`);

        // gnb-main-trigger 클릭시 해당 위치로 스크롤
        item.addEventListener('click', (event) => {
          event.preventDefault();
          const id = item.getAttribute('aria-controls');
          const top = document.getElementById(id).offsetTop;
          const gnbBody = document.querySelector('.gnb-body');
          gnbBody.scrollTo({
            left: 0,
            top: top,
            behavior: 'smooth',
          });
        });
      });

      const tabPanels = document.querySelectorAll('.submenu-wrap .gnb-sub-list');
      tabPanels.forEach((item, idx) => {
        item.setAttribute('role', 'tabpanel');
        item.setAttribute('aria-labelledby', `tab-${idx}`);
      });
    }
  },
  attachEvents(mobileGnb) {
    const id = mobileGnb.getAttribute('id');
    const openGnb = document.querySelector(`[aria-controls=${id}]`);
    const closeGnb = mobileGnb.querySelector('#close-nav');

    openGnb.addEventListener('click', () => this.openMainMenu(mobileGnb));
    closeGnb.addEventListener('click', () => this.closeMainMenu(mobileGnb));
    this.setupAnchorScroll(mobileGnb);
    this.setupAnchorLinks(mobileGnb);

    // 반응형 처리
    window.addEventListener('resize', () => {
      const isPC = windowSize.getWinSize() === 'pc';
      if (isPC) this.closeMainMenu(mobileGnb);
    });
  },
  openMainMenu(mobileGnb) {
    const navContainer = mobileGnb.querySelector('.gnb-wrap');
    // const id = mobileGnb.getAttribute("id");
    // const openGnb = document.querySelector(`[aria-controls=${id}]`);
    // const header = document.querySelector("#krds-header");

    mobileGnb.style.display = 'block';
    navContainer.setAttribute('tabindex', 0);
    // openGnb.setAttribute("aria-expanded", "true");
    // header.style.zIndex = "1000";

    // active 메뉴로 스크롤 이동
    const activeTrigger = document.querySelector('.gnb-main-trigger.active');
    if (activeTrigger) {
      const id = activeTrigger.getAttribute('aria-controls');
      const top = document.getElementById(id).offsetTop;
      const gnbBody = document.querySelector('.gnb-body');
      gnbBody.style.scrollBehavior = 'auto';
      gnbBody.scrollTop = top;
    }

    setTimeout(() => {
      mobileGnb.classList.add('is-backdrop');
      mobileGnb.classList.add('is-open');
      document.body.classList.add('is-gnb-mobile');
    }, 100);

    // transition 종료후 실행
    mobileGnb.addEventListener('transitionend', function onTransitionEnd() {
      navContainer.focus();
      mobileGnb.removeEventListener('transitionend', onTransitionEnd);

      // inert 설정
      document.querySelector('#krds-header .header-in').setAttribute('inert', '');
      document.getElementById('container')?.setAttribute('inert', '');
      document.getElementById('footer')?.setAttribute('inert', '');

      // 포커스 트랩 설정
      common.focusTrap(mobileGnb);
    });
  },
  closeMainMenu(mobileGnb) {
    const id = mobileGnb.getAttribute('id');
    const openGnb = document.querySelector(`[aria-controls=${id}]`);
    // const header = document.querySelector("#krds-header");

    mobileGnb.classList.remove('is-backdrop');
    mobileGnb.classList.remove('is-open');
    // openGnb.setAttribute("aria-expanded", "false");
    // header.style.zIndex = "";

    // inert 설정
    document.querySelector('#krds-header .header-in').removeAttribute('inert');
    document.getElementById('container')?.removeAttribute('inert');
    document.getElementById('footer')?.removeAttribute('inert');

    // transition 종료후 실행
    mobileGnb.addEventListener('transitionend', function onTransitionEnd() {
      openGnb.focus();
      mobileGnb.removeEventListener('transitionend', onTransitionEnd);
    });

    setTimeout(() => {
      mobileGnb.style.display = 'none';
      document.body.classList.remove('is-gnb-mobile');
    }, 400);
  },
  setupAnchorScroll(mobileGnb) {
    const gnbBody = mobileGnb.querySelector('.gnb-body');
    const navContainer = mobileGnb.querySelector('.gnb-wrap');
    const navItems = mobileGnb.querySelectorAll('.submenu-wrap .gnb-sub-list');
    const headerTabArea = mobileGnb.querySelector('.gnb-tab-nav');
    const headerTabMenu = headerTabArea?.querySelector('.menu-wrap');

    gnbBody.addEventListener('scroll', () => {
      const scrollTop = gnbBody.scrollTop;
      const scrollHeight = gnbBody.scrollHeight;
      const bodyHeight = gnbBody.clientHeight;

      navItems.forEach((item) => {
        const id = item.getAttribute('id');
        const menuLink = mobileGnb.querySelector(`[href="#${id}"]`);
        const offset = item.offsetTop;
        if (scrollTop >= offset || bodyHeight + scrollTop >= scrollHeight) {
          this.resetAnchorMenu();
          menuLink.classList.add('active');
          menuLink.setAttribute('aria-selected', 'true');
          if (headerTabArea) {
            const headerTabMenuUl = headerTabMenu.querySelector('ul');
            gnbBody.addEventListener('scrollend', () => {
              headerTabMenuUl.scrollLeft = menuLink.offsetLeft;
            });
          }
        }
      });

      this.handleTopScroll(headerTabArea, navContainer, gnbBody);
    });
  },
  handleTopScroll(headerTabArea, navContainer, gnbBody) {
    // gnb-mobile-type1(headerTabArea: gnb-tab-nav)
    let lastBodyScrollY = 0;

    if (!headerTabArea) return; // 요소가 없을 경우 함수 종료

    gnbBody.addEventListener('scroll', (event) => {
      const bodyScrollY = event.target.scrollTop;

      if (bodyScrollY > 0) {
        headerTabArea.style.height = `${headerTabArea.scrollHeight}px`;
        headerTabArea.style.transition = 'ease-out .4s';
        navContainer.classList.add('is-active');
      } else if (bodyScrollY < 50 && bodyScrollY < lastBodyScrollY) {
        headerTabArea.style.height = '';
        headerTabArea.style.transition = 'ease-out .4s .2s';
        setTimeout(() => {
          navContainer.classList.remove('is-active');
        }, 600);
      }

      lastBodyScrollY = bodyScrollY;
    });
  },
  setupAnchorLinks(mobileGnb) {
    const menuItems = mobileGnb.querySelectorAll('.menu-wrap .gnb-main-trigger');
    const navItems = mobileGnb.querySelectorAll('.submenu-wrap .gnb-sub-list');

    if (!document.querySelector('.menu-wrap .gnb-main-trigger.active')) {
      if (menuItems && menuItems.length > 0) {
        menuItems[0].classList.add('active');
        menuItems[0].setAttribute('aria-selected', 'true');
      }
    }

    // 3depth
    navItems.forEach((item) => {
      const depth3Items = item.querySelectorAll('.has-depth3');
      if (depth3Items.length > 0) {
        depth3Items.forEach((item) => {
          if (item.classList.contains('active')) {
            item.classList.add('active');
            item.setAttribute('aria-expanded', 'true');
            item.nextElementSibling.classList.add('is-open');
          } else {
            item.setAttribute('aria-expanded', 'false');
          }
          item.addEventListener('click', (event) => this.handleDepth3Click(event, item));
        });
      }
    });

    // 4depth
    navItems.forEach((item) => {
      const depth4Items = item.querySelectorAll('.has-depth4');
      if (depth4Items.length > 0) {
        depth4Items.forEach((item) => {
          item.addEventListener('click', (event) => this.handleDepth4Click(event, item));
        });
      }
    });
  },
  handleDepth3Click(event) {
    const isActive = event.target.classList.contains('active');

    const resetList = () => {
      document.querySelectorAll('.has-depth3').forEach((depth3) => {
        depth3.classList.remove('active');
        depth3.setAttribute('aria-expanded', 'false');
        depth3.nextElementSibling.classList.remove('is-open');
      });
    };

    if (!isActive) {
      // resetList();
      event.target.classList.add('active');
      event.target.setAttribute('aria-expanded', 'true');
      event.target.nextElementSibling.classList.add('is-open');
    } else {
      // resetList();
      event.target.classList.remove('active');
      event.target.setAttribute('aria-expanded', 'false');
      event.target.nextElementSibling.classList.remove('is-open');
    }
  },
  handleDepth4Click(event) {
    const target = event.target.nextElementSibling;
    const prevButton = target.querySelector('.trigger-prev');
    const closeButton = target.querySelector('.trigger-close');

    target.style.display = 'block';
    setTimeout(() => {
      target.classList.add('is-open');
    }, 0);
    prevButton.focus();

    const depth4Close = () => {
      target.classList.remove('is-open');
      event.target.focus();
      setTimeout(() => {
        target.style.display = '';
      }, 400);
    };

    prevButton.addEventListener('click', depth4Close);
    closeButton.addEventListener('click', depth4Close);

    // 포커스 트랩 설정
    common.focusTrap(target);
  },
  resetAnchorMenu() {
    document.querySelectorAll('.krds-main-menu-mobile .menu-wrap .gnb-main-trigger').forEach((menu) => {
      menu.classList.remove('active');
      menu.setAttribute('aria-selected', 'false');
    });
  },
};

/*** * krds_sideNavigation * ***/
const krds_sideNavigation = {
  init() {
    this.setupSideNavLists();
    this.setupToggleEvents();
    this.setupPopupEvents();
  },
  setupSideNavLists() {
    const sideNavLists = document.querySelectorAll('.krds-side-navigation .lnb-list');
    sideNavLists.forEach((navList) => {
      const navItems = navList.querySelectorAll('li');
      navItems.forEach((navItem) => this.setupNavItem(navItem));
    });
  },
  setupNavItem(navItem) {
    const navButton = navItem.querySelector('.lnb-btn');
    if (!navButton || !navButton.className.includes('lnb-toggle')) return;

    const uniqueIdx = `lnbmenu-${Math.random().toString(36).substring(2, 9)}`;
    const navSubmenu = navButton.nextElementSibling;

    // aria 설정
    navButton.setAttribute('aria-controls', uniqueIdx);
    navButton.setAttribute('aria-expanded', navButton.classList.contains('active'));

    // 서브메뉴 id 설정 및 popup 처리
    if (navButton.classList.contains('lnb-toggle-popup')) {
      navButton.setAttribute('aria-haspopup', 'true');
    }
    if (navSubmenu && navSubmenu.className.includes('lnb-submenu')) {
      const navSubmenuList = navSubmenu.classList.contains('lnb-submenu-lv2') ? navSubmenu : navSubmenu.querySelector(':scope > ul');
      navSubmenuList?.setAttribute('id', uniqueIdx);
    }
  },
  setupToggleEvents() {
    const toggleButtons = document.querySelectorAll('.krds-side-navigation .lnb-list:not(.exception-case) .lnb-toggle');
    toggleButtons.forEach((toggleButton) => {
      toggleButton.addEventListener('click', () => {
        const expand = toggleButton.getAttribute('aria-expanded') !== 'true';

        //this.toggleMenu(toggleButton, expand); 클릭 시 해당 버튼만 활성화 상태로 변경되어 해당 이벤트 주석처리.
        //this.closeSiblingMenus(toggleButton);  클릭 시 해당 버튼만 활성화 상태로 변경되어 해당 이벤트 주석처리.
        this.setActiveNav(toggleButton, expand);
      });
    });
  },
  setActiveNav(toggleButton, expand) {
    const parentListItem = toggleButton.closest('li');
    toggleButton.setAttribute('aria-expanded', expand ? 'true' : 'false');
    parentListItem.classList.toggle('active', expand);
  },
  setupPopupEvents() {
    let lastClickedButton = null;

    const popupToggleButtons = document.querySelectorAll('.lnb-toggle-popup');
    const popupSubmenus = document.querySelectorAll('.lnb-submenu-lv2');

    // 팝업 토글 버튼
    popupToggleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const popupSubmenu = button.nextElementSibling;
        if (popupSubmenu && popupSubmenu.classList.contains('lnb-submenu-lv2')) {
          popupSubmenu.classList.add('active');
          button.setAttribute('aria-expanded', 'true');

          popupSubmenu.addEventListener(
            'transitionend',
            () => {
              popupSubmenu.querySelector('.lnb-btn-tit')?.focus();
            },
            { once: true },
          );

          lastClickedButton = button;
        }
      });
    });

    // 서브 메뉴가 포커스를 잃으면 비활성화
    popupSubmenus.forEach((popupSubmenu) => {
      popupSubmenu.addEventListener('focusout', (event) => {
        // 포커스가 서브메뉴 밖으로 나갔는지 확인
        if (!popupSubmenu.contains(event.relatedTarget)) {
          popupSubmenu.classList.remove('active');

          if (lastClickedButton) {
            lastClickedButton.setAttribute('aria-expanded', 'false');
            popupSubmenu.addEventListener(
              'transitionend',
              () => {
                lastClickedButton.focus();
              },
              { once: true },
            );
          }
        }
      });

      // lnb-btn-tit 클릭 시 서브메뉴 닫기
      const subMenuTitleButton = popupSubmenu.querySelector('.lnb-btn-tit');
      subMenuTitleButton?.addEventListener('click', () => {
        lastClickedButton?.focus();
      });
    });
  },
  toggleMenu(toggleButton, expand) {
    const parentListItem = toggleButton.closest('li');
    toggleButton.setAttribute('aria-expanded', expand);
    toggleButton.classList.toggle('active', expand);
    parentListItem.classList.toggle('active', expand);
  },
  closeSiblingMenus(toggleButton) {
    const parentListItem = toggleButton.closest('li');
    const siblingButtons = parentListItem.parentNode.querySelectorAll(':scope > li > .lnb-toggle');
    siblingButtons.forEach((siblingButton) => {
      if (siblingButton !== toggleButton) {
        this.toggleMenu(siblingButton, false);
      }
    });
  },
  setActiveCurrentPage() {
    // 활성화된 페이지를 찾는 예(개발 환경에 맞게 수정)
    const currentPage = window.location.pathname.split('/').slice(-1)[0].replace('.html', '');
    const lnbLinks = document.querySelectorAll('.krds-side-navigation .lnb-link');
    lnbLinks.forEach((link) => {
      const linkPage = link.getAttribute('href').split('/').pop().replace('.html', '');
      if (linkPage === currentPage) {
        link.closest('.lnb-item').classList.add('active');
        link.closest('.lnb-item').querySelector('.lnb-toggle')?.classList.add('active');
        link.closest('.lnb-item').querySelector('.lnb-toggle')?.setAttribute('aria-expanded', 'true');
        link.closest('li').classList.add('active');
        // 접근성 현재 페이지 표시 aria-current
        link.setAttribute('aria-current', 'page');
      }
    });
  },
};

/*** * krds_tab * ***/
const krds_tab = {
  layerTabArea: null,
  init() {
    this.layerTabArea = document.querySelectorAll('.krds-tab-area.layer');

    if (!this.layerTabArea.length) return;

    this.setupTabs();
  },
  setupTabs() {
    this.layerTabArea.forEach((tabArea) => {
      const layerTabs = tabArea.querySelectorAll(':scope > .tab > ul > li');

      //  default tab 세팅
      if (!tabArea.dataset.tabInitialized) {
        const defaultIndex = Number(tabArea.dataset.defaultTab ?? 0);
        layerTabs.forEach((tab) => tab.classList.remove('active'));
        layerTabs[defaultIndex]?.classList.add('active');
        tabArea.dataset.tabInitialized = 'true';
      }

      // 탭 설정
      layerTabs.forEach((tab) => {
        if (!tab.dataset.listenerAttached) {
          const control = tab.getAttribute('aria-controls');
          const selectedTabPanel = document.getElementById(control);

          tab.setAttribute('aria-selected', 'false');
          tab.setAttribute('role', 'tab');
          selectedTabPanel.setAttribute('role', 'tabpanel');
          selectedTabPanel.setAttribute('data-quick-nav', 'false');

          // 초기 active 처리
          if (tab.classList.contains('active')) {
            if (!tab.querySelector('button .sr-only')) {
              tab.querySelector('button').append(this.createAccText());
            }
            tab.setAttribute('aria-selected', 'true');
            selectedTabPanel.classList.add('active');
            selectedTabPanel.setAttribute('data-quick-nav', 'true');
          }

          tab.addEventListener('click', (e) => {
            const tabBtn = tab.querySelector('.btn-tab');
            if (!tabBtn || !tabBtn.contains(e.target)) return;
            const closestTabs = tab.closest('.krds-tab-area.layer > .tab').querySelectorAll('li');
            const closestTabPanels = tab.closest('.krds-tab-area.layer').querySelectorAll(':scope > .tab-conts-wrap > .tab-conts');

            this.resetTabs(closestTabs, closestTabPanels);

            tab.classList.add('active');
            tab.querySelector('button').append(this.createAccText());
            tab.setAttribute('aria-selected', 'true');
            selectedTabPanel.classList.add('active');
            selectedTabPanel.setAttribute('data-quick-nav', 'true');
          });

          this.setupKeyboardNavigation(tab);
          tab.dataset.listenerAttached = '';
        }
      });
    });
  },
  createAccText() {
    const tabAccTag = document.createElement('i');
    tabAccTag.classList.add('sr-only');
    tabAccTag.textContent = '선택됨';
    return tabAccTag;
  },
  resetTabs(closestTabs, closestTabPanels) {
    closestTabs.forEach((tab) => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
      // 대체 텍스트 삭제
      const srOnly = tab.querySelector('.sr-only');
      if (srOnly) tab.querySelector('button').removeChild(srOnly);
    });
    closestTabPanels.forEach((panel) => {
      panel.setAttribute('data-quick-nav', 'false');
      panel.classList.remove('active');
    });
  },
  setupKeyboardNavigation(tab) {
    tab.addEventListener('keydown', function (event) {
      let newTab;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        newTab = tab.nextElementSibling?.querySelector('button');
      } else if (event.key === 'ArrowLeft') {
        newTab = tab.previousElementSibling?.querySelector('button');
      }
      newTab?.focus();
    });
  },
  resetToDefault(tabArea) {
    const tabs = tabArea.querySelectorAll(':scope > .tab > ul > li');
    const panels = tabArea.querySelectorAll(':scope > .tab-conts-wrap > .tab-conts');

    const defaultIndex = Number(tabArea.dataset.defaultTab ?? 0);

    this.resetTabs(tabs, panels);

    const defaultTab = tabs[defaultIndex];
    const defaultPanel = document.getElementById(defaultTab?.getAttribute('aria-controls'));

    if (!defaultTab || !defaultPanel) return;

    defaultTab.classList.add('active');
    defaultTab.setAttribute('aria-selected', 'true');

    if (!defaultTab.querySelector('.sr-only')) {
      defaultTab.querySelector('button').append(this.createAccText());
    }

    defaultPanel.classList.add('active');
    defaultPanel.setAttribute('data-quick-nav', 'true');
  },
};

/*** * krds_accordion * ***/
const krds_accordion = {
  accordionButtons: null,
  accordionHandlers: new Map(),
  init() {
    this.accordionButtons = document.querySelectorAll('.btn-accordion');

    if (!this.accordionButtons.length) return;

    this.setupAccordions();
  },
  accordionToggle(button, accordionItems, accordionType, currentItem) {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    // singleOpen 타입일 경우, 다른 항목 닫기
    if (accordionType !== 'multiOpen' && !currentItem.classList.contains('active')) {
      accordionItems.forEach((otherItem) => {
        const otherButton = otherItem.querySelector('.btn-accordion');
        otherButton.setAttribute('aria-expanded', 'false');
        otherButton.classList.remove('active');
        otherItem.classList.remove('active');
      });
    }
    // 현재 항목 상태 토글
    button.setAttribute('aria-expanded', !isExpanded);
    button.classList.toggle('active', !isExpanded);
    currentItem.classList.toggle('active', !isExpanded);
  },
  setupAccordions() {
    this.accordionButtons.forEach((button, idx) => {
      const accordionContainer = button.closest('.krds-accordion');
      const accordionItems = accordionContainer.querySelectorAll('.accordion-item');
      const currentItem = button.closest('.accordion-item');
      const accordionContent = currentItem.querySelector('.accordion-collapse');
      const accordionType = accordionContainer.dataset.type || 'singleOpen';
      const isOpen = accordionContainer.classList.contains('is-open');

      // 접근성 속성 초기값 설정
      this.setupAriaAttributes(button, accordionContent, idx);

      // 초기 오픈 상태 설정
      if (isOpen || currentItem.classList.contains('active')) {
        button.setAttribute('aria-expanded', 'true');
        button.classList.add('active');
        currentItem.classList.add('active');
      }

      // 핸들러 고정 및 저장
      let toggleHandler = this.accordionHandlers.get(button);
      if (!toggleHandler) {
        toggleHandler = this.accordionToggle.bind(this, button, accordionItems, accordionType, currentItem);
        this.accordionHandlers.set(button, toggleHandler);
      }

      // 기존 이벤트 리스너 제거 및 새로 등록
      button.removeEventListener('click', toggleHandler);
      button.addEventListener('click', toggleHandler);
    });
  },
  setupAriaAttributes(button, accordionContent, idx) {
    const uniqueIdx = `${idx}${Math.random().toString(36).substring(2, 9)}`;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('id', `accordionHeader-id-${uniqueIdx}`);
    button.setAttribute('aria-controls', `accordionCollapse-id-${uniqueIdx}`);
    accordionContent.setAttribute('role', 'region');
    accordionContent.setAttribute('id', `accordionCollapse-id-${uniqueIdx}`);
    accordionContent.setAttribute('aria-labelledby', `accordionHeader-id-${uniqueIdx}`);
  },
};

/*** * krds_modal * ***/
const krds_modal = {
  modalOpenTriggers: null,
  modalCloseTriggers: null,
  outsideClickHandlers: {},
  _triggerMap: {},
  init() {
    this.modalOpenTriggers = document.querySelectorAll('.open-modal');
    this.modalCloseTriggers = document.querySelectorAll('.close-modal');

    if (!this.modalOpenTriggers.length || !this.modalCloseTriggers.length) return;

    this.setupTriggers();
  },
  setupTriggers() {
    // 모달 열기 이벤트 설정
    this.modalOpenTriggers.forEach((trigger) => {
      if (trigger._krdsModalOpenHandler) return;
      const handler = (event) => {
        event.preventDefault();
        const modalId = trigger.getAttribute('data-target');

        if (modalId) {
          // aria 설정
          trigger.setAttribute('data-modal-id', modalId);
          trigger.classList.add('modal-opened');
          trigger.setAttribute('tabindex', '-1');

          this.openModal(modalId);
        }
      };
      trigger.addEventListener('click', handler);
      trigger._krdsModalOpenHandler = handler;
    });
    // 모달 닫기 이벤트 설정
    this.modalCloseTriggers.forEach((trigger) => {
      if (trigger._krdsModalCloseHandler) return;
      const handler = (event) => {
        event.preventDefault();
        const modalId = trigger.closest('.krds-modal').getAttribute('id');

        if (modalId) {
          this.closeModal(modalId);
        }
      };
      trigger.addEventListener('click', handler);
      trigger._krdsModalCloseHandler = handler;
    });
  },
  openModal(id) {
    krds_mainMenuPC.closeMainMenu();
    const modalElement = document.getElementById(id);
    const dialogElement = modalElement.querySelector('.modal-content');
    const modalBack = modalElement.querySelector('.modal-back');
    // const modalTitle = modalElement.querySelector(".modal-title");
    const modalConts = modalElement.querySelector('.modal-conts');

    // document.querySelector('body').classList.add('scroll-no');
    modalElement.style.display = 'block';
    modalElement.setAttribute('role', 'dialog');
    modalBack.classList.add('in');
    // modalTitle.setAttribute("tabindex", "0");

    // modal-conts 스크롤 일때 tabindex 처리
    if (modalConts.scrollHeight > modalConts.clientHeight) {
      modalConts.setAttribute('tabindex', '0');
    } else {
      modalConts.removeAttribute('tabindex');
    }

    // css transition 딜레이
    setTimeout(() => {
      modalElement.classList.add('in');
    }, 150);

    setTimeout(() => {
      document.querySelector('body').classList.add('scroll-no');
    }, 0);

    // 열린 팝업창 포커스
    const focusables = modalElement.querySelectorAll(`a, button, [tabindex="0"], input, textarea, select`);
    const firstFocusable = focusables[0];
    const isFirstIframe = firstFocusable?.tagName === 'IFRAME';

    // dialogElement: iframe이 첫 요소면 tabindex="-1"로 초기 포커스 대상으로 지정
    dialogElement.setAttribute('tabindex', isFirstIframe ? '-1' : undefined);
    if (!isFirstIframe) dialogElement.removeAttribute('tabindex');

    setTimeout(() => {
      if (isFirstIframe) {
        dialogElement.focus();
      } else {
        firstFocusable?.focus();
      }
    }, 350);

    // ESC 모달 닫기
    // document 레벨에서 처리: iframe에 포커스가 있어도 동작하도록
    if (!this._escHandlers) this._escHandlers = {};
    // 기존 핸들러가 있으면 먼저 제거
    if (this._escHandlers[id]) {
      document.removeEventListener('keydown', this._escHandlers[id]);
    }
    this._escHandlers[id] = (event) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        // 현재 가장 위에 열린(z-index 기준) 모달만 닫기
        const openModals = Array.from(document.querySelectorAll('.krds-modal.in'));
        if (!openModals.length) return;
        const topModal = openModals.reduce((top, el) => {
          const z = parseInt(el.style.zIndex || 0, 10);
          const topZ = parseInt(top.style.zIndex || 0, 10);
          return z >= topZ ? el : top;
        });
        if (topModal.getAttribute('id') === id) {
          this.closeModal(id);
        }
      }
    };
    document.addEventListener('keydown', this._escHandlers[id]);

    // 모달 외부 클릭 처리 핸들러 정의 및 저장
    if (!this.outsideClickHandlers[id]) {
      this.outsideClickHandlers[id] = (event) => {
        if (!event.target.closest('.modal-content')) {
          // iframe이 첫 요소면 dialogElement로, 아니면 첫 focusable로 복귀
          if (isFirstIframe) {
            dialogElement.focus();
          } else {
            firstFocusable?.focus();
          }
        }
      };
    }
    // 이벤트 리스너 제거 후 다시 등록
    modalElement.removeEventListener('click', this.outsideClickHandlers[id]);
    modalElement.addEventListener('click', this.outsideClickHandlers[id]);

    // 포커스 트랩 설정 (iframe 포함)
    this._insertIframeSentinel(dialogElement);
    common.focusTrap(dialogElement);

    // 2개 이상의 모달이 열려 있는 경우 z-index 업데이트
    this.updateZIndex(modalElement);

    // inert 설정
    document.getElementById('wrap')?.setAttribute('inert', '');
  },
  closeModal(id, callback) {
    const modalElement = document.getElementById(id);
    const dialogElement = modalElement.querySelector('.modal-content');
    const modalBack = modalElement.querySelector('.modal-back');

    modalElement.classList.remove('in');
    modalBack.classList.remove('in');

    // css transition 딜레이
    setTimeout(() => {
      modalElement.style.display = 'none'; // 추가
      if (typeof callback === 'function') {
        callback(modalElement);
      }
    }, 350);

    const remainingModals = document.querySelectorAll('.krds-modal.in');
    if (remainingModals.length === 0) {
      document.querySelector('body').classList.remove('scroll-no');
    }

    // inert 설정
    document.getElementById('wrap')?.removeAttribute('inert');

    // ESC 핸들러 제거
    if (this._escHandlers && this._escHandlers[id]) {
      document.removeEventListener('keydown', this._escHandlers[id]);
      delete this._escHandlers[id];
    }

    // 포커스 트랩 해제
    common.focusTrapRemove(dialogElement);

    // sentinel 정리
    this._removeIframeSentinel(dialogElement);

    // 모달을 열었던 버튼으로 포커스 복귀
    this.returnFocusToTrigger(id);
  },
  updateZIndex(modalElement) {
    const openModals = document.querySelectorAll('.krds-modal.in');
    const openModalsLengtn = openModals.length + 1;
    const newZIndex = 1010 + openModalsLengtn;
    if (openModalsLengtn > 1) {
      modalElement.style.zIndex = newZIndex;
      modalElement.querySelector('.modal-back').classList.remove('in');
    }
  },
  returnFocusToTrigger(id) {
    const triggerButton = document.querySelector(`.modal-opened[data-modal-id="${id}"]`);
    if (triggerButton) {
      triggerButton.focus();
      triggerButton.setAttribute('tabindex', '0');
      triggerButton.classList.remove('modal-opened');
      triggerButton.removeAttribute('data-modal-id');
      return;
    }
    if (this._triggerMap[id]) {
      this._triggerMap[id].focus();
      delete this._triggerMap[id];
    }
  },

  // ── iframe sentinel ─────────────────────────────────────────────
  // cross-origin iframe(YouTube 등)에서 Shift+Tab 시 브라우저가 주소표시줄로
  // 포커스를 보내는 것을 JS로 막을 수 없다.
  // 대신 iframe 바로 앞에 tabindex="0" sentinel을 두면,
  // 주소표시줄 → 페이지로 돌아올 때 sentinel이 포커스를 받는다.
  // sentinel의 focus 핸들러에서 마지막 포커스 가능 요소로 redirect한다.
  _insertIframeSentinel(dialogElement) {
    // 이미 삽입된 sentinel이 있으면 재사용
    const existing = dialogElement.querySelector('.krds-iframe-sentinel');
    if (existing) return;

    const iframes = dialogElement.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      const sentinel = document.createElement('span');
      sentinel.className = 'krds-iframe-sentinel';
      sentinel.setAttribute('tabindex', '0');
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';

      sentinel.addEventListener('focus', () => {
        // sentinel에 포커스가 오면 → 모달 안 마지막 포커스 가능 요소로 이동
        const focusables = Array.from(dialogElement.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]):not(.krds-iframe-sentinel), iframe')).filter((el) => !el.closest('[inert]') && !el.closest('[hidden]'));

        const lastEl = focusables[focusables.length - 1];
        if (lastEl) lastEl.focus();
      });

      // iframe 바로 앞에 삽입
      iframe.parentNode.insertBefore(sentinel, iframe);
    });
  },

  _removeIframeSentinel(dialogElement) {
    dialogElement?.querySelectorAll('.krds-iframe-sentinel').forEach((s) => s.remove());
  },
};

/*** * krds_tooltip * ***/
const krds_tooltip = {
  tooltip: null,
  isMobile: null,
  init() {
    this.tooltip = document.querySelectorAll('.krds-tooltip');
    this.isMobile = windowSize.getWinSize() === 'mob';

    if (!this.tooltip.length) return;

    this.setupTooltips();
    this.setupGlobalEvents();
  },
  setupTooltips() {
    this.tooltip.forEach((item, index) => {
      //  tooltipText
      const tooltipText = item.getAttribute('data-tooltip');
      const disabled = item.hasAttribute('disabled');

      if (!tooltipText || disabled) return;

      // ID 부여
      const uniqueIdx = `tooltip-popover-${index}${Math.random().toString(36).substring(2, 9)}`;
      item.setAttribute('aria-labelledby', uniqueIdx);

      // TooltipPopover 생성
      const tooltipBtnText = item.innerText;
      const tooltipPopover = this.createTooltipPopover(uniqueIdx, tooltipBtnText, tooltipText);
      item.parentNode.insertBefore(tooltipPopover, item.nextSibling);

      // Show/Hide 함수 정의
      const showTooltip = () => this.showTooltip(item, tooltipPopover);

      // 이벤트 등록
      this.registerEvents(item, showTooltip);

      // ESC 닫기
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' || event.key === 'Esc') {
          this.closeAllTooltips();
        }
      });
    });
  },
  createTooltipPopover(uniqueIdx, tooltipBtnText, tooltipText) {
    const tooltipPopover = document.createElement('div');
    tooltipPopover.classList.add('krds-tooltip-popover');
    tooltipPopover.setAttribute('id', uniqueIdx);
    tooltipPopover.setAttribute('aria-hidden', 'true');
    tooltipPopover.innerHTML = '';
    tooltipPopover.innerHTML = `
      <span class="sr-only">${tooltipBtnText}</span>
      ${tooltipText}
    `;

    return tooltipPopover;
  },
  registerEvents(item, showTooltip) {
    item.addEventListener('mouseover', showTooltip);
    item.addEventListener('mouseout', this.closeAllTooltips);
    item.addEventListener('focus', showTooltip);
    item.addEventListener('focusout', this.closeAllTooltips);
  },
  showTooltip(item, tooltipPopover) {
    // tooltip-box
    if (item.classList.contains('tooltip-box')) {
      tooltipPopover.classList.add('tooltip-box');
    }
    // tooltip-vertical
    if (item.classList.contains('tooltip-vertical')) {
      tooltipPopover.classList.add('tooltip-vertical');
    }

    tooltipPopover.classList.add('active');

    const { top, left } = this.calculateTooltipPosition(item, tooltipPopover);
    const mobileSmall = window.innerWidth <= 420;
    tooltipPopover.style.top = `${top}px`;
    tooltipPopover.style.left = mobileSmall ? '50%' : `${left}px`;
  },
  closeAllTooltips() {
    const otherPopovers = document.querySelectorAll('.krds-tooltip-popover');
    otherPopovers.forEach((popover) => {
      if (!popover.classList.contains('active')) return;
      popover.style = '';
      popover.className = 'krds-tooltip-popover';
    });
  },
  calculateTooltipPosition(item, tooltipPopover) {
    // 툴팁과 기준 요소 간격
    const tooltipGap = 12;
    const { clientHeight: tooltipHeight, clientWidth: tooltipWidth } = tooltipPopover;
    const { top: itemTop, left: itemLeft, right: itemRight, height: itemHeight, width: itemWidth } = item.getBoundingClientRect();
    const halfWindowWidth = window.innerWidth / 2;
    const halfWindowHeight = window.innerHeight / 2;

    let tooltipTop;
    let tooltipLeft;

    const isVertical = this.isMobile || item.classList.contains('tooltip-box') || item.classList.contains('tooltip-vertical');

    if (isVertical) {
      if (itemTop + itemHeight > halfWindowHeight) {
        tooltipTop = itemTop - tooltipHeight - tooltipGap; // 위쪽
        tooltipPopover.classList.add('top');
      } else {
        tooltipTop = itemTop + itemHeight + tooltipGap; // 아래쪽
        tooltipPopover.classList.add('bottom');
      }
      // 좌우 위치
      if (itemLeft + itemWidth > halfWindowWidth) {
        tooltipLeft = itemRight - tooltipWidth; // 오른쪽 정렬
        tooltipPopover.classList.add('right');
        // 화면 오른쪽 여유 공간이 충분할 때 가운데 정렬
        if (window.innerWidth - (itemLeft + itemWidth) > tooltipWidth / 2) {
          tooltipLeft = itemLeft + (itemWidth - tooltipWidth) / 2;
          tooltipPopover.classList.remove('right');
        }
      } else {
        // 화면 왼쪽 여유 공간이 충분할 때 가운데 정렬
        tooltipLeft = itemLeft + (itemWidth - tooltipWidth) / 2;
        // 왼쪽 공간 부족 시 보정
        if (tooltipLeft < 0) {
          tooltipLeft = itemLeft;
          tooltipPopover.classList.add('left');
        } else {
          tooltipPopover.classList.remove('left');
        }
      }
    } else {
      // 가로형 툴팁
      tooltipTop = itemTop + (itemHeight - tooltipHeight) / 2;
      if (itemLeft + itemWidth > halfWindowWidth) {
        tooltipLeft = itemLeft - tooltipWidth - tooltipGap; // 왼쪽
        tooltipPopover.classList.add('right');
      } else {
        tooltipLeft = itemRight + tooltipGap; // 오른쪽
        tooltipPopover.classList.remove('right');
      }
    }
    return { top: tooltipTop, left: tooltipLeft };
  },
  setupGlobalEvents() {
    window.addEventListener('scroll', () => {
      this.closeAllTooltips();
    });
    window.addEventListener('resize', () => {
      this.isMobile = windowSize.getWinSize() === 'mob';
      this.closeAllTooltips();
    });
  },
};

/*** * krds_calendar - KRDS 표준 캘린더 (접근성 개선) * ***/
const krds_calendar = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  selectedDate: null,
  startDate: null,
  endDate: null,
  currentArea: null,
  currentConts: null,
  calendarType: 'single',
  activeTarget: null, // range 버튼2개 모드: 'start' | 'end' | null
  openTrigger: null, // 현재 열린 버튼 참조
  _bound: false, // document 리스너 중복 등록 방지 플래그

  // 날짜 객체를 yyyy-mm-dd 형식의 문자열로 반환
  formatDate(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  },

  // yyyy.mm.dd, yyyy-mm-dd 모두 Date로 파싱 지원
  parseDate(dateStr) {
    if (!dateStr) return null;
    let arr;
    if (dateStr.includes('.')) {
      arr = dateStr.split('.').map(Number);
    } else if (dateStr.includes('-')) {
      arr = dateStr.split('-').map(Number);
    } else {
      return null;
    }
    if (arr.length !== 3) return null;
    return new Date(arr[0], arr[1] - 1, arr[2]);
  },

  init() {
    // document 리스너는 한 번만 등록
    if (this._bound) return;
    this._bound = true;
    this.bindOpen();
    this.bindClose();
  },

  bindOpen() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.form-btn-datepicker');
      if (!btn) return;

      const conts = btn.closest('.calendar-conts');
      if (!conts) return;
      const area = conts.querySelector('.krds-calendar-area');
      if (!area) return;
      const type = conts.getAttribute('data-calendar-type') || 'single';

      // ── 토글 판단 ──
      // 현재 열린 버튼과 같은 버튼 → 닫기만
      if (this.openTrigger === btn) {
        this.closeAllDatePickers();
        return;
      }
      // 다른 버튼(또는 아직 열린 것이 없음) → 기존 것은 닫고, 아래로 내려가 열기
      this.closeAllDatePickers();

      // ── 상태 세팅 ──
      this.calendarType = type;
      this.currentConts = conts;
      this.currentArea = area;
      this.openTrigger = btn;
      this.selectedDate = null;

      // range 버튼2개 모드: data-date-target="start" | "end"
      const dateTarget = btn.getAttribute('data-date-target');
      this.activeTarget = type === 'range' && dateTarget ? dateTarget : null;

      if (type === 'single') {
        this.startDate = null;
        this.endDate = null;
      } else {
        const inputs = conts.querySelectorAll('.datepicker');
        if (inputs.length >= 2) {
          this.startDate = this.toDashDate(inputs[0].value) || null;
          this.endDate = this.toDashDate(inputs[1].value) || null;
        } else {
          this.startDate = null;
          this.endDate = null;
        }
      }

      // end 버튼 클릭 시 startDate가 아직 비어있으면 열지 않음
      if (this.activeTarget === 'end' && !this.startDate) {
        this.closeAllDatePickers();
        return;
      }

      area.dataset.keyboardBound = 'true';
      this.openDatePicker(area);
    });
  },

  // yyyy.mm.dd 혹은 yyyy-mm-dd 를 yyyy-mm-dd로 변환
  toDashDate(val) {
    if (!val) return null;
    if (val.includes('-')) return val;
    if (val.includes('.')) return val.replace(/\./g, '-');
    return val;
  },

  bindClose() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.calendar-wrap')) return;
      if (e.target.closest('.form-btn-datepicker')) return;
      if (e.target.closest('.calendar-drop-down')) return;
      this.closeAllDatePickers();
    });
  },

  focusSelectedDate(area) {
    let targetDate = null;
    if (this.calendarType === 'single') {
      targetDate = this.selectedDate;
    } else {
      targetDate = this.endDate || this.startDate;
    }
    if (!targetDate) return;

    requestAnimationFrame(() => {
      if (this.calendarType === 'single' && this.selectedDate) {
        this.handleSingleDateSelect(this.selectedDate, area);
      } else if (this.calendarType === 'range' && this.startDate && !this.endDate) {
        this.handleRangeDateSelect(this.startDate, area, true);
      } else if (this.calendarType === 'range' && this.startDate && this.endDate) {
        this.highlightRange(area);
      }

      area.querySelector(`td[data-date="${targetDate}"] .btn-set-date:not([disabled])`)?.focus();
    });
  },

  openDatePicker(area) {
    const input = this.currentConts.querySelector('.datepicker');
    const hasValue = input && input.value;

    if (this.calendarType === 'single') {
      if (hasValue) {
        const [y, m, d] = input.value.includes('.') ? input.value.split('.').map(Number) : input.value.split('-').map(Number);
        this.currentYear = y;
        this.currentMonth = m;
        this.selectedDate = this.formatDate(y, m, d);
      } else {
        const today = new Date();
        this.currentYear = today.getFullYear();
        this.currentMonth = today.getMonth() + 1;
        this.selectedDate = this.formatDate(this.currentYear, this.currentMonth, today.getDate());
      }
    } else {
      const inputs = this.currentConts.querySelectorAll('.datepicker');
      if (inputs.length >= 2 && (inputs[0].value || inputs[1].value)) {
        if (inputs[0].value) {
          const [y, m, d] = inputs[0].value.includes('.') ? inputs[0].value.split('.').map(Number) : inputs[0].value.split('-').map(Number);
          this.currentYear = y;
          this.currentMonth = m;
          this.startDate = this.formatDate(y, m, d);
        }
        if (inputs[1].value) {
          const [y2, m2, d2] = inputs[1].value.includes('.') ? inputs[1].value.split('.').map(Number) : inputs[1].value.split('-').map(Number);
          if (!inputs[0].value) {
            this.currentYear = y2;
            this.currentMonth = m2;
          }
          this.endDate = this.formatDate(y2, m2, d2);
        }
      } else if (hasValue) {
        const [y, m, d] = input.value.includes('.') ? input.value.split('.').map(Number) : input.value.split('-').map(Number);
        this.currentYear = y;
        this.currentMonth = m;
        this.startDate = this.formatDate(y, m, d);
        this.endDate = null;
      } else {
        const today = new Date();
        this.currentYear = today.getFullYear();
        this.currentMonth = today.getMonth() + 1;
        const todayStr = this.formatDate(this.currentYear, this.currentMonth, today.getDate());
        this.startDate = todayStr;
        this.endDate = null;
      }
    }

    area.innerHTML = this.renderCalendar(this.currentYear, this.currentMonth);

    this.bindCalendarEvents(area);
    this.bindKeyboardNavigation(area);
    this.activateFocusTrap(area);
    this.focusSelectedDate(area);
  },

  closeAllDatePickers() {
    document.querySelectorAll('.krds-calendar-area').forEach((area) => {
      if (area._keydownHandler) {
        area.removeEventListener('keydown', area._keydownHandler);
        area._keydownHandler = null;
      }
      if (area._focusTrapHandler) {
        area.removeEventListener('keydown', area._focusTrapHandler);
        area._focusTrapHandler = null;
      }
      area.dataset.keyboardBound = 'false';
      area.innerHTML = '';
    });

    document.querySelectorAll('.calendar-select').forEach((selectBox) => {
      selectBox.classList.remove('active');
    });
    document.querySelectorAll('.btn-cal-switch').forEach((btn) => {
      btn.classList.remove('active');
    });

    if (this.openTrigger) {
      const trigger = this.openTrigger;
      this.openTrigger = null;
      requestAnimationFrame(() => {
        trigger.focus();
      });
    }
  },

  bindCalendarEvents(area) {
    const prevBtn = area.querySelector('.btn-cal-move.prev');
    const nextBtn = area.querySelector('.btn-cal-move.next');

    prevBtn?.addEventListener('click', () => {
      const focusTarget = prevBtn;
      this.currentMonth--;
      if (this.currentMonth < 1) {
        this.currentMonth = 12;
        this.currentYear--;
      }
      this.updateCalendar(area, focusTarget);
    });

    nextBtn?.addEventListener('click', () => {
      const focusTarget = nextBtn;
      this.currentMonth++;
      if (this.currentMonth > 12) {
        this.currentMonth = 1;
        this.currentYear++;
      }
      this.updateCalendar(area, focusTarget);
    });

    this.bindDropdown(area, 'year');
    this.bindDropdown(area, 'month');

    const todayBtn = area.querySelector('.get-today');
    todayBtn?.addEventListener('click', () => {
      const today = new Date();
      this.currentYear = today.getFullYear();
      this.currentMonth = today.getMonth() + 1;

      const todayStr = this.formatDate(this.currentYear, this.currentMonth, today.getDate());

      if (this.calendarType === 'single') {
        this.selectedDate = todayStr;
      } else {
        this.startDate = todayStr;
        this.endDate = null;
      }

      this.updateCalendar(area);
      this.focusSelectedDate(area);
    });

    const dateBtns = area.querySelectorAll('.btn-set-date:not(:disabled)');
    dateBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const td = btn.closest('td');
        const dateStr = td.getAttribute('data-date');

        if (this.calendarType === 'single') {
          this.handleSingleDateSelect(dateStr, area);
        } else {
          this.handleRangeDateSelect(dateStr, area);
        }
      });
    });

    const cancelBtn = area.querySelector('.calendar-footer .krds-btn.tertiary');
    cancelBtn?.addEventListener('click', () => {
      this.closeAllDatePickers();
    });

    const confirmBtn = area.querySelector('.calendar-footer .krds-btn.primary');
    confirmBtn?.addEventListener('click', () => {
      this.confirmSelection();
    });
  },

  bindDropdown(area, type) {
    const dropdown = area.querySelector(`.calendar-drop-down.${type}`);
    if (!dropdown) return;

    const btn = dropdown.querySelector('.btn-cal-switch');
    const selectBox = dropdown.querySelector('.calendar-select');
    const items = selectBox.querySelectorAll('.sel button');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = selectBox.classList.contains('active');

      area.querySelectorAll('.calendar-select').forEach((el) => el.classList.remove('active'));
      area.querySelectorAll('.btn-cal-switch').forEach((el) => {
        el.classList.remove('active');
        el.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        selectBox.classList.add('active');
        btn.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });

    items.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.disabled) return;

        items.forEach((i) => {
          i.classList.remove('active');
          i.setAttribute('aria-selected', 'false');
        });

        item.classList.add('active');
        item.setAttribute('aria-selected', 'true');

        const value = Number(item.dataset.value);
        type === 'year' ? (this.currentYear = value) : (this.currentMonth = value);

        selectBox.classList.remove('active');
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');

        this.updateCalendar(area, btn);
      });
    });
  },

  handleSingleDateSelect(dateStr, area) {
    this.selectedDate = this.toDashDate(dateStr);

    area.querySelectorAll('.btn-set-date').forEach((btn) => {
      btn.closest('td').classList.remove('period', 'start', 'end');
    });

    const selectedTd = area.querySelector(`td[data-date="${this.selectedDate}"]`);
    if (selectedTd) {
      selectedTd.classList.add('period', 'start', 'end');
    }
  },

  handleRangeDateSelect(dateStr, area, isRestore = false) {
    const curDateStr = this.toDashDate(dateStr);
    const clickedDate = this.parseDate(curDateStr);

    // ── 버튼2개 모드: activeTarget = 'start' ──
    if (this.activeTarget === 'start') {
      if (!isRestore) {
        if (this.endDate) {
          const endDateObj = this.parseDate(this.endDate);
          if (clickedDate > endDateObj) this.endDate = null;
        }
        this.startDate = curDateStr;
      }
      area.querySelectorAll('td').forEach((td) => td.classList.remove('period', 'start', 'end', 'between'));
      if (this.startDate && this.endDate) {
        this.highlightRange(area);
      } else {
        const startTd = area.querySelector(`td[data-date="${this.startDate}"]`);
        if (startTd) startTd.classList.add('period', 'start');
      }
      return;
    }

    // ── 버튼2개 모드: activeTarget = 'end' ──
    if (this.activeTarget === 'end') {
      if (!isRestore) {
        if (this.startDate) {
          const startDateObj = this.parseDate(this.startDate);
          if (clickedDate < startDateObj) {
            this.endDate = this.startDate;
            this.startDate = curDateStr;
          } else if (clickedDate.getTime() === startDateObj.getTime()) {
            this.endDate = null;
          } else {
            this.endDate = curDateStr;
          }
        } else {
          this.endDate = curDateStr;
        }
      }
      area.querySelectorAll('td').forEach((td) => td.classList.remove('period', 'start', 'end', 'between'));
      if (this.startDate && this.endDate) {
        this.highlightRange(area);
      } else if (this.startDate) {
        const startTd = area.querySelector(`td[data-date="${this.startDate}"]`);
        if (startTd) startTd.classList.add('period', 'start');
      }
      return;
    }

    // ── 기존 버튼1개 모드 (activeTarget === null) ──
    if (!this.startDate || (this.startDate && this.endDate)) {
      if (!isRestore) {
        this.startDate = curDateStr;
        this.endDate = null;
      }

      area.querySelectorAll('td').forEach((td) => {
        td.classList.remove('period', 'start', 'end', 'between');
      });

      const startTd = area.querySelector(`td[data-date="${curDateStr}"]`);
      if (startTd) startTd.classList.add('period', 'start');
    } else {
      const startDateObj = this.parseDate(this.startDate);

      if (clickedDate < startDateObj) {
        if (!isRestore) {
          this.startDate = curDateStr;
          this.endDate = null;
        }

        area.querySelectorAll('td').forEach((td) => {
          td.classList.remove('period', 'start', 'end', 'between');
        });

        const startTd = area.querySelector(`td[data-date="${curDateStr}"]`);
        if (startTd) startTd.classList.add('period', 'start');
      } else if (clickedDate.getTime() === startDateObj.getTime()) {
        if (!isRestore) {
          this.endDate = null;
        }

        area.querySelectorAll('td').forEach((td) => {
          td.classList.remove('period', 'start', 'end', 'between');
        });

        const startTd = area.querySelector(`td[data-date="${curDateStr}"]`);
        if (startTd) startTd.classList.add('period', 'start');
      } else {
        if (!isRestore) {
          this.endDate = curDateStr;
        }

        area.querySelectorAll('td').forEach((td) => {
          td.classList.remove('period', 'start', 'end', 'between');
        });

        this.highlightRange(area);
      }
    }
  },

  highlightRange(area) {
    if (!this.startDate || !this.endDate) return;

    const start = this.parseDate(this.startDate);
    const end = this.parseDate(this.endDate);

    area.querySelectorAll('td[data-date]').forEach((td) => {
      const dateStr = this.toDashDate(td.getAttribute('data-date'));
      const date = this.parseDate(dateStr);

      td.classList.remove('period', 'start', 'end', 'between');

      if (date >= start && date <= end) {
        if (dateStr === this.startDate) {
          td.classList.add('period', 'start');
        } else if (dateStr === this.endDate) {
          td.classList.add('period', 'end');
        } else {
          td.classList.add('period', 'between');
        }
      }
    });
  },

  confirmSelection() {
    if (this.calendarType === 'single') {
      if (this.selectedDate) {
        const input = this.currentConts.querySelector('.datepicker');
        if (input) input.value = this.selectedDate;
      }
    } else {
      const inputs = this.currentConts.querySelectorAll('.datepicker');
      if (inputs.length >= 2) {
        if (this.activeTarget === 'start') {
          if (this.startDate) inputs[0].value = this.startDate;
          if (!this.endDate) inputs[1].value = '';
        } else if (this.activeTarget === 'end') {
          if (this.startDate) inputs[0].value = this.startDate;
          if (this.endDate) inputs[1].value = this.endDate;
        } else {
          // 버튼1개 모드
          if (this.startDate && this.endDate) {
            inputs[0].value = this.startDate;
            inputs[1].value = this.endDate;
          }
        }
      }
    }

    this.closeAllDatePickers();
  },

  updateCalendar(area, focusTarget = null) {
    area.innerHTML = this.renderCalendar(this.currentYear, this.currentMonth);
    this.bindCalendarEvents(area);

    if (this.calendarType === 'range' && this.startDate) {
      if (this.endDate) {
        this.highlightRange(area);
      } else {
        area.querySelector(`td[data-date="${this.startDate}"]`)?.classList.add('period', 'start');
      }
    } else if (this.calendarType === 'single' && this.selectedDate) {
      area.querySelector(`td[data-date="${this.selectedDate}"]`)?.classList.add('period', 'start', 'end');
    }

    requestAnimationFrame(() => {
      if (focusTarget) {
        let selector = '';
        if (focusTarget.classList.contains('prev')) selector = '.btn-cal-move.prev';
        else if (focusTarget.classList.contains('next')) selector = '.btn-cal-move.next';
        else if (focusTarget.classList.contains('year')) selector = '.btn-cal-switch.year';
        else if (focusTarget.classList.contains('month')) selector = '.btn-cal-switch.month';

        const el = area.querySelector(selector);
        if (el) {
          el.focus();
          return;
        }
      }

      let focusDate = null;

      if (this.calendarType === 'single' && this.selectedDate) {
        focusDate = this.selectedDate;
        this.handleSingleDateSelect(this.selectedDate, area);
      }

      if (this.calendarType === 'range' && this.startDate && !this.endDate) {
        focusDate = this.startDate;
        this.handleRangeDateSelect(this.startDate, area, true);
      }

      if (this.calendarType === 'range' && this.endDate) {
        focusDate = this.endDate;
        this.highlightRange(area);
      }

      if (focusDate) {
        const btn = area.querySelector(`td[data-date="${focusDate}"] .btn-set-date:not([disabled])`);
        if (btn) {
          btn.focus();
          return;
        }
      }

      const todayBtn = area.querySelector('td.today .btn-set-date:not([disabled])');
      if (todayBtn) {
        todayBtn.focus();
        return;
      }

      area.querySelector('.btn-set-date:not([disabled])')?.focus();
    });
  },

  renderCalendar(year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const lastDate = new Date(year, month, 0).getDate();
    const prevLastDate = new Date(year, month - 1, 0).getDate();
    const today = new Date();
    const todayStr = this.formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

    let day = 1;
    let nextDay = 1;
    const rows = [];

    for (let r = 0; r < 6; r++) {
      const tds = [];

      for (let c = 0; c < 7; c++) {
        let td = '';

        if (r === 0 && c < firstDay) {
          const d = prevLastDate - firstDay + c + 1;
          const prevMonth = month === 1 ? 12 : month - 1;
          const prevYear = month === 1 ? year - 1 : year;
          const dateStr = this.formatDate(prevYear, prevMonth, d);

          td = `<td class="old${c === 0 ? ' day-off' : ''}" data-date="${dateStr}">
            <button type="button" class="btn-set-date" disabled aria-label="${prevYear}년 ${prevMonth}월 ${d}일, 이전 달">
              <span aria-hidden="true">${d}</span>
            </button>
          </td>`;
        } else if (day > lastDate) {
          const nextMonth = month === 12 ? 1 : month + 1;
          const nextYear = month === 12 ? year + 1 : year;
          const dateStr = this.formatDate(nextYear, nextMonth, nextDay);

          td = `<td class="new${c === 0 ? ' day-off' : ''}" data-date="${dateStr}">
            <button type="button" class="btn-set-date" disabled aria-label="${nextYear}년 ${nextMonth}월 ${nextDay}일, 다음 달">
              <span aria-hidden="true">${nextDay++}</span>
            </button>
          </td>`;
        } else {
          const dateStr = this.formatDate(year, month, day);
          const isToday = dateStr === todayStr;
          const classes = [];

          if (c === 0) classes.push('day-off');
          if (isToday) classes.push('today');

          let ariaLabel = `${year}년 ${month}월 ${day}일`;
          if (isToday) ariaLabel += ', 오늘';
          if (c === 0) ariaLabel += ', 일요일';

          const ariaCurrent = isToday ? ' aria-current="date"' : '';

          td = `<td${classes.length ? ` class="${classes.join(' ')}"` : ''} data-date="${dateStr}">
            <button type="button" class="btn-set-date" aria-label="${ariaLabel}"${ariaCurrent}>
              <span aria-hidden="true">${day}</span>
            </button>
          </td>`;
          day++;
        }

        tds.push(td);
      }

      rows.push(`<tr>${tds.join('')}</tr>`);
      if (day > lastDate && r >= 4) break;
    }

    const yearOptions = [];
    const uniqueYearId = `combo-list-year-${Math.random().toString(36).substring(2, 9)}`;

    for (let y = year - 10; y <= year + 10; y++) {
      const isCurrentYear = y === year;
      yearOptions.push(`
        <li role="none">
          <button type="button" role="option" data-value="${y}" 
                  class="${isCurrentYear ? 'active' : ''}"
                  aria-selected="${isCurrentYear}"
                  ${isCurrentYear ? 'disabled' : ''}>
            ${y}년
          </button>
        </li>
      `);
    }

    const monthOptions = [];
    const uniqueMonthId = `combo-list-month-${Math.random().toString(36).substring(2, 9)}`;

    for (let m = 1; m <= 12; m++) {
      const isCurrentMonth = m === month;
      monthOptions.push(`
        <li role="none">
          <button type="button" role="option" data-value="${m}"
                  class="${isCurrentMonth ? 'active' : ''}"
                  aria-selected="${isCurrentMonth}"
                  ${isCurrentMonth ? 'disabled' : ''}>
            ${String(m).padStart(2, '0')}월
          </button>
        </li>
      `);
    }

    return `
<div class="calendar-wrap ${this.calendarType}" role="application" aria-label="날짜 선택 캘린더" tabindex="0">
    
  <div class="calendar-head">
    <button type="button" class="btn-cal-move prev" aria-label="이전 달로 이동">
      <span class="sr-only">이전 달</span>
    </button>
    <div class="calendar-switch-wrap">
      <div class="calendar-drop-down year">
        <button type="button" class="btn-cal-switch year" aria-label="년도 선택, 현재 ${year}년" aria-expanded="false" aria-haspopup="listbox">${year}년</button>
        <div class="calendar-select calendar-year-wrap">
          <ul class="sel year" role="listbox" id="${uniqueYearId}" aria-label="년도 목록">
            ${yearOptions.join('')}
          </ul>
        </div>
      </div>
      <div class="calendar-drop-down month">
        <button type="button" class="btn-cal-switch month" aria-label="월 선택, 현재 ${month}월" aria-expanded="false" aria-haspopup="listbox">${String(month).padStart(2, '0')}월</button>
        <div class="calendar-select calendar-month-wrap">
          <ul class="sel month" role="listbox" id="${uniqueMonthId}" aria-label="월 목록">
            ${monthOptions.join('')}
          </ul>
        </div>
      </div>
    </div>
    <button type="button" class="btn-cal-move next" aria-label="다음 달로 이동">
      <span class="sr-only">다음 달</span>
    </button>
  </div>
  <div class="calendar-body">
    <div class="calendar-table-wrap">
      <table class="calendar-tbl" role="grid" aria-labelledby="calendar-caption">
        <caption id="calendar-caption">${year}년 ${month}월</caption>
        <thead>
          <tr>
            <th scope="col" abbr="일요일">일</th>
            <th scope="col" abbr="월요일">월</th>
            <th scope="col" abbr="화요일">화</th>
            <th scope="col" abbr="수요일">수</th>
            <th scope="col" abbr="목요일">목</th>
            <th scope="col" abbr="금요일">금</th>
            <th scope="col" abbr="토요일">토</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    </div>
  </div>
  <div class="calendar-footer">
    <div class="calendar-btn-wrap">
      <button type="button" class="krds-btn small text get-today" aria-label="오늘 날짜로 이동">오늘</button>
      <button type="button" class="krds-btn small tertiary" aria-label="날짜 선택 취소">취소</button>
      <button type="button" class="krds-btn small primary" aria-label="선택한 날짜 확인">확인</button>
    </div>
  </div>
</div>
<div class="calendar-backdrop"></div>`;
  },

  activateFocusTrap(area) {
    // 기존 핸들러 있으면 먼저 제거
    if (area._focusTrapHandler) {
      area.removeEventListener('keydown', area._focusTrapHandler);
      area._focusTrapHandler = null;
    }

    const focusables = area.querySelectorAll('button:not([disabled]), [tabindex="0"]');
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    const handler = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    area._focusTrapHandler = handler;
    area.addEventListener('keydown', handler);
  },

  bindKeyboardNavigation(area) {
    // 기존 이벤트 리스너 제거 후 새로 등록
    if (area._keydownHandler) {
      area.removeEventListener('keydown', area._keydownHandler);
      area._keydownHandler = null;
    }

    const handler = (e) => {
      const key = e.key;
      const active = document.activeElement;

      // 날짜 버튼이 포커스된 경우만 처리
      if (!active.classList.contains('btn-set-date')) return;

      const td = active.closest('td');
      let targetTd;

      switch (key) {
        case 'ArrowLeft':
          e.preventDefault();
          targetTd = td.previousElementSibling;
          break;

        case 'ArrowRight':
          e.preventDefault();
          targetTd = td.nextElementSibling;
          break;

        case 'ArrowUp':
          e.preventDefault();
          targetTd = td.parentElement.previousElementSibling?.children[td.cellIndex];
          break;

        case 'ArrowDown':
          e.preventDefault();
          targetTd = td.parentElement.nextElementSibling?.children[td.cellIndex];
          break;

        case 'PageUp':
          e.preventDefault();
          if (e.shiftKey) {
            this.currentYear--;
          } else {
            this.currentMonth--;
            if (this.currentMonth < 1) {
              this.currentMonth = 12;
              this.currentYear--;
            }
          }
          this.updateCalendar(area);
          return;

        case 'PageDown':
          e.preventDefault();
          if (e.shiftKey) {
            this.currentYear++;
          } else {
            this.currentMonth++;
            if (this.currentMonth > 12) {
              this.currentMonth = 1;
              this.currentYear++;
            }
          }
          this.updateCalendar(area);
          return;

        case 'Home':
          e.preventDefault();
          targetTd = td.parentElement.children[0];
          break;

        case 'End':
          e.preventDefault();
          const tr = td.parentElement;
          targetTd = tr.children[tr.children.length - 1];
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          active.click();
          return;

        case 'Escape':
          e.preventDefault();
          this.closeAllDatePickers();
          return;

        default:
          return;
      }

      // 대상 셀의 버튼으로 포커스 이동
      const targetBtn = targetTd?.querySelector('.btn-set-date:not([disabled])');
      if (targetBtn) {
        targetBtn.focus();
      }
    };

    area._keydownHandler = handler;
    area.addEventListener('keydown', handler);
  },
};

/*** * krds_toggleSwitch * ***/
const krds_toggleSwitch = {
  init() {
    const toggleSwitch = document.querySelectorAll('.krds-form-toggle-switch');

    if (!toggleSwitch.length) return;

    toggleSwitch.forEach((toggle) => {
      const input = toggle.querySelector('input');
      if (!input) return;
      input.addEventListener('focus', () => {
        toggle.classList.add('focus');
      });
      input.addEventListener('focusout', () => {
        toggle.classList.remove('focus');
      });
    });
  },
};
const krds_dropEvent = {
  /*** * krds_dropEvent(gnb utils / page-title-wrap) * ***/
  dropButtons: null,
  init() {
    this.dropButtons = document.querySelectorAll('.krds-drop-wrap .drop-btn');

    if (!this.dropButtons.length) return;

    this.setupEventListeners();
    this.setupFocusOutEvent();
  },
  setupEventListeners() {
    this.dropButtons.forEach((button) => {
      const menu = button.nextElementSibling;
      button.setAttribute('aria-expanded', 'false');

      button.addEventListener('click', () => {
        const isOpen = menu.style.display === 'block';
        this.closeAllDropdowns();
        if (!isOpen) {
          this.openDropdown(button, menu);
        }
      });

      this.setupMenuItems(menu);
    });
  },
  setupMenuItems(menu) {
    const items = menu.querySelectorAll('.item-link');

    items.forEach((item) => {
      item.innerHTML += `<span class="sr-only"></span>`;
      if (item.classList.contains('active')) {
        item.querySelector('.sr-only').innerHTML = '선택됨';
      }

      item.addEventListener('click', () => {
        this.activateMenuItem(item);
        this.closeAllDropdowns();
        const button = item.closest('.krds-drop-wrap').querySelector('.drop-btn');
        button?.focus();
      });

      item.addEventListener('focus', () => {
        document.querySelectorAll('.krds-drop-wrap .drop-list .item-link').forEach((item) => {
          item.style.position = 'relative';
          item.style.zIndex = '0';
        });
        item.style.zIndex = '1';
      });
    });
  },
  activateMenuItem(selectedItem) {
    const menu = selectedItem.closest('.drop-menu');
    const items = menu.querySelectorAll('.item-link');

    items.forEach((item) => {
      item.classList.remove('active');
      item.setAttribute('aria-selected', 'false');
      item.querySelector('.sr-only').innerText = '';
    });

    selectedItem.classList.add('active');
    selectedItem.setAttribute('aria-selected', 'true');
    selectedItem.querySelector('.sr-only').innerText = '선택됨';
  },
  openDropdown(button, menu) {
    menu.style.display = 'block';
    button.classList.add('active');
    button.setAttribute('aria-expanded', 'true');

    // 여백에 따라 위치 조정
    const menuRect = menu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    if (menuRect.left < 0) {
      menu.closest('.krds-drop-wrap').classList.add('drop-left');
    } else if (windowWidth < menuRect.left + menuRect.width) {
      menu.closest('.krds-drop-wrap').classList.add('drop-right');
    }
  },
  closeAllDropdowns() {
    document.querySelectorAll('.krds-drop-wrap .drop-menu').forEach((menu) => {
      menu.style.display = 'none';
    });
    this.dropButtons.forEach((button) => {
      button.classList.remove('active');
      button.setAttribute('aria-expanded', 'false');
    });
  },
  setupFocusOutEvent() {
    // ESC 닫기
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        this.closeAllDropdowns();
        event.target.closest('.krds-drop-wrap')?.querySelector('.drop-btn')?.focus();
      }
    });

    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.krds-drop-wrap')) {
        this.closeAllDropdowns();
      }
    });

    // 드롭다운 포커스 아웃 처리
    this.dropButtons.forEach((button) => {
      const menu = button.nextElementSibling;

      if (!menu) return;

      // 드롭다운 메뉴의 포커스 아웃 처리
      menu.addEventListener('focusout', (event) => {
        const isFocusInside = menu.contains(event.relatedTarget) || button.contains(event.relatedTarget);
        if (!isFocusInside) {
          this.closeAllDropdowns();
        }
      });

      // 버튼의 포커스 아웃 처리
      button.addEventListener('focusout', (event) => {
        const isFocusInside = menu.contains(event.relatedTarget) || button.contains(event.relatedTarget);
        if (!isFocusInside) {
          this.closeAllDropdowns();
        }
      });
    });
  },
};

// ========================================
// 초기화 함수 통합
// ========================================
function initAllComponents() {
  windowSize.setWinSize();

  krds_mainMenuPC.init();
  krds_mainMenuMobile.init();
  krds_sideNavigation.init();
  krds_tab.init();
  krds_accordion.init();
  krds_modal.init();
  krds_calendar.init();
  krds_dropEvent.init();
  krds_tooltip.init();
  krds_toggleSwitch.init();
}
function initMenus() {
  windowSize.setWinSize();

  krds_mainMenuPC.init();
  krds_mainMenuMobile.init();
  krds_sideNavigation.init();
}
function initContents() {
  windowSize.setWinSize();

  krds_tab.init();
  krds_accordion.init();
  krds_modal.init();
  krds_calendar.init();
  krds_dropEvent.init();
  krds_tooltip.init();
  krds_toggleSwitch.init();
}

// ========================================
// MutationObserver - 타임리프 동적 감지
// ========================================
let observerTimeout = null;
let isInitializing = false;

const contentObserver = new MutationObserver((mutations) => {
  if (isInitializing) return;
  clearTimeout(observerTimeout);

  observerTimeout = setTimeout(() => {
    if (isInitializing) return;

    let hasKrdsComponent = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (
              node.classList?.contains('krds-main-menu') ||
              node.classList?.contains('krds-main-menu-mobile') ||
              node.classList?.contains('krds-side-navigation') ||
              node.classList?.contains('krds-tab') ||
              node.classList?.contains('krds-accordion') ||
              node.classList?.contains('krds-modal') ||
              node.classList?.contains('calendar-conts') ||
              node.classList?.contains('krds-drop-wrap') ||
              node.classList?.contains('krds-form-toggle-switch') ||
              node.matches?.('[class*="krds-"]') ||
              node.querySelector?.('[class*="krds-"]') ||
              node.querySelector?.('.calendar-conts') ||
              node.querySelector?.('[data-tooltip]')
            ) {
              hasKrdsComponent = true;
            }
          }
        });
      }
    }

    if (hasKrdsComponent) {
      isInitializing = true;
      contentObserver.disconnect();

      try {
        initContents();
      } finally {
        contentObserver.observe(document.body, observerConfig);
        isInitializing = false;
      }
    }
  }, 100);
});

// 초기 이벤트
const observerConfig = {
  childList: true,
  subtree: true,
  attributes: false,
};

window.addEventListener('DOMContentLoaded', () => {
  initAllComponents();
  contentObserver.observe(document.body, observerConfig);
});

// 스크롤 이벤트
window.addEventListener('scroll', () => {
  scrollManager.updateScrollValues();
  scrollManager.handleScrollDirection();

  krds_mainMenuPC.closeMainMenu();
  // krds_inPageNavigation.updateActiveSection();
  // krds_helpPanel.init();
});

// 리사이즈 이벤트
window.addEventListener('resize', () => {
  windowSize.setWinSize();
  // krds_helpPanel.init();
});

// 수동 재초기화
window.krdsReinitialize = initAllComponents;

/**
 * GNB + LNB selected 클래스 동적 처리
 *
 * 사용법:
 *   GNB.init({ depth1: 2 + 1, depth2: 1 + 1, depth3: 0 + 1 });
 *
 * 옵션:
 *   depth1 : 1Depth 인덱스 (0부터) - PC GNB, 모바일 GNB
 *   depth2 : 2Depth 인덱스 (0부터) - LNB 기준, 모바일 GNB
 *   depth3 : 3Depth 인덱스 (0부터) - LNB, 모바일 GNB
 *
 * ─────────────────────────────────────────────
 * 적용 범위:
 *
 * depth1 →  PC GNB 1Depth, 모바일 GNB 1Depth
 * depth2 →  PC LNB 2Depth (기준), 모바일 GNB 2Depth
 *           PC GNB 2Depth는 LNB 선택값 기준으로 자동 매칭
 * depth3 →  PC LNB 3Depth, 모바일 GNB 3Depth
 * ─────────────────────────────────────────────
 */

const GNB = (() => {
  let config = null;

  const setSelected = ({ depth1, depth2, depth3 }) => {
    const d1 = depth1 != null ? depth1 - 1 : null;
    const d2 = depth2 != null ? depth2 - 1 : null;
    const d3 = depth3 != null ? depth3 - 1 : null;

    setPcGnb(d1, d2);
    setMobileGnb(d1, d2, d3);
    setLnb(d2, d3);
  };
  const init = ({ depth1, depth2, depth3 }) => {
    config = { depth1, depth2, depth3 };
    const requiredSelectors = ['.krds-main-menu:not(.krds-main-menu-mobile)', '.krds-main-menu-mobile', '.krds-side-navigation'];

    const tryInit = () => {
      const allReady = requiredSelectors.every((sel) => document.querySelector(sel));

      if (!allReady) {
        requestAnimationFrame(tryInit);
        return;
      }

      setSelected(config);
    };

    tryInit();
  };

  // ── PC GNB : 1Depth + 2Depth (자동 매칭) ─────────────────────────────
  const setPcGnb = (depth1, depth2) => {
    const gnbMenu = document.querySelector('.krds-main-menu:not(.krds-main-menu-mobile)');
    if (!gnbMenu) return;

    // ── 1Depth ──
    if (depth1 !== undefined && depth1 !== null) {
      const depth1Triggers = gnbMenu.querySelectorAll('.gnb-main-trigger');

      depth1Triggers.forEach((el, i) => {
        const isSelected = i === depth1;
        el.classList.toggle('selected', isSelected);

        if (isSelected) {
          el.setAttribute('aria-current', 'page');
        } else {
          el.removeAttribute('aria-current');
        }
      });
    }

    // ── 2Depth (LNB 선택값 기준으로 자동 매칭) ──
    if (depth2 === undefined || depth2 === null) return;

    // LNB에서 선택된 항목의 텍스트 가져오기
    const lnbNav = document.querySelector('.krds-side-navigation');
    if (!lnbNav) return;

    const lnbItems = lnbNav.querySelectorAll('.lnb-list > .lnb-item');
    const selectedLnbItem = lnbItems[depth2];
    if (!selectedLnbItem) return;

    // LNB 2Depth의 텍스트 추출
    const lnbToggle = selectedLnbItem.querySelector('.lnb-toggle');
    const lnbDirectLink = selectedLnbItem.querySelector(':scope > .lnb-link');
    const lnbText = (lnbToggle || lnbDirectLink)?.textContent?.trim();

    if (!lnbText) return;

    // PC GNB에서 같은 텍스트를 가진 2Depth 찾기
    const gnbDropdowns = gnbMenu.querySelectorAll('.gnb-dropdown');
    const targetDropdown = gnbDropdowns[depth1];
    if (!targetDropdown) return;

    const depth2Links = targetDropdown.querySelectorAll('.gnb-sub-content ul > li > a');

    depth2Links.forEach((link) => {
      const linkText = link.textContent?.trim();
      const isMatch = linkText && linkText.includes(lnbText);

      link.classList.toggle('selected', isMatch);

      if (isMatch) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  // ── 모바일 GNB : 1Depth + 2Depth + 3Depth ─────────────────────
  const setMobileGnb = (depth1, depth2, depth3) => {
    const mobileNav = document.querySelector('.krds-main-menu-mobile');
    if (!mobileNav) return;

    // ── 1Depth ──
    if (depth1 !== undefined && depth1 !== null) {
      const mobile1Triggers = mobileNav.querySelectorAll('.menu-wrap .gnb-main-trigger');

      mobile1Triggers.forEach((el, i) => {
        const isActive = i === depth1;
        el.classList.toggle('active', isActive);

        if (isActive) {
          el.setAttribute('aria-current', 'page');
          el.setAttribute('aria-selected', 'true');
        } else {
          el.removeAttribute('aria-current');
          el.setAttribute('aria-selected', 'false');
        }
      });
    }

    // ── 2Depth ──
    if (depth2 === undefined || depth2 === null) return;

    const subMenuLists = mobileNav.querySelectorAll('.submenu-wrap > .gnb-sub-list');
    const targetList = subMenuLists[depth1];
    if (!targetList) return;

    const depth2Triggers = targetList.querySelectorAll(':scope > ul > li > .gnb-sub-trigger');

    depth2Triggers.forEach((el, i) => {
      const isActive = i === depth2;
      el.classList.toggle('active', isActive);

      if (isActive && el.classList.contains('has-depth3')) {
        el.setAttribute('aria-expanded', 'true');
      } else {
        el.setAttribute('aria-expanded', 'false');
      }
    });

    // ── 3Depth ──
    if (depth3 === undefined || depth3 === null) return;

    const selectedDepth2 = depth2Triggers[depth2];
    if (!selectedDepth2 || !selectedDepth2.classList.contains('has-depth3')) return;

    const depth3Wrap = selectedDepth2.nextElementSibling;
    if (!depth3Wrap || !depth3Wrap.classList.contains('depth3-wrap')) return;

    const depth3Triggers = depth3Wrap.querySelectorAll(':scope > ul > li > .depth3-trigger');

    depth3Triggers.forEach((el, i) => {
      const isSelected = i === depth3;
      el.classList.toggle('selected', isSelected);

      if (isSelected) {
        el.setAttribute('aria-current', 'page');
      } else {
        el.removeAttribute('aria-current');
      }
    });
  };

  // ── PC LNB : 2Depth + 3Depth ─────────────────────
  const setLnb = (depth2, depth3) => {
    const lnbNav = document.querySelector('.krds-side-navigation');
    if (!lnbNav) return;

    const lnbItems = lnbNav.querySelectorAll('.lnb-list > .lnb-item');

    // ── 먼저 모든 항목 초기화 ──
    lnbItems.forEach((li) => {
      li.classList.remove('active');

      const toggleBtn = li.querySelector('.lnb-toggle');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
      }

      const directLink = li.querySelector(':scope > .lnb-link');
      if (directLink) {
        directLink.classList.remove('selected');
        directLink.removeAttribute('aria-current');
      }
    });

    // 모든 3Depth 링크 초기화
    const allSubLinks = lnbNav.querySelectorAll('.lnb-subitem > .lnb-link');
    allSubLinks.forEach((link) => {
      link.classList.remove('active', 'selected');
      link.removeAttribute('aria-current');
    });

    // ── 2Depth (.lnb-item) 설정 ──
    if (depth2 !== undefined && depth2 !== null) {
      const targetItem = lnbItems[depth2];

      if (targetItem) {
        targetItem.classList.add('active');

        const toggleBtn = targetItem.querySelector('.lnb-toggle');
        if (toggleBtn) {
          setTimeout(() => {
            toggleBtn.setAttribute('aria-expanded', 'true');
          }, 0);
        }

        const directLink = targetItem.querySelector(':scope > .lnb-link');
        if (directLink) {
          directLink.classList.add('selected');
          directLink.setAttribute('aria-current', 'page');
        }
      }
    }

    // ── 3Depth (.lnb-subitem) 설정 ──
    if (depth3 === undefined || depth3 === null) return;

    const targetItem = lnbItems[depth2];
    if (!targetItem) return;

    const submenu = targetItem.querySelector('.lnb-submenu ul');
    if (!submenu) return;

    const lnbLinks = submenu.querySelectorAll('.lnb-subitem > .lnb-link');
    const targetLink = lnbLinks[depth3];

    if (targetLink) {
      targetLink.classList.add('active', 'selected');
      targetLink.setAttribute('aria-current', 'page');
    }
  };

  return {
    setSelected,
    init,
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  const switcherLinks = document.querySelectorAll('.main-switcher a');
  const utilityItems = document.querySelectorAll('.gnb-utils .utility-list li');

  // 요소가 없으면 실행 안 함
  if (!switcherLinks.length && !utilityItems.length) return;

  function setActive(index) {
    switcherLinks.forEach((a, i) => {
      a.classList.toggle('active', i === index);
    });
    utilityItems.forEach((li, i) => {
      li.classList.toggle('active', i === index);
    });
  }

  // 클릭 이벤트
  switcherLinks.forEach((a, i) => {
    a.addEventListener('click', (e) => {
      setActive(i);
    });
  });

  utilityItems.forEach((li, i) => {
    li.querySelector('a')?.addEventListener('click', (e) => {
      setActive(i);
    });
  });

  // body 클래스 기준 초기 활성화
  const pageIndex = document.body.classList.contains('ai-type') ? 1 : document.body.classList.contains('profile-type') ? 2 : 0;

  setActive(pageIndex);
});
const setScrollbarWidth = () => {
  const scrollbarWidth = window.innerWidth - document.body.clientWidth;
  document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
};
const syncLnbTitleToPage = () => {
  const lnbTitle = document.querySelector('#lnb .lnb-tit');
  const pageTitleWrap = document.querySelector('.contents .page-title-wrap');

  if (!lnbTitle || !pageTitleWrap) return;

  const existingSrTitle = pageTitleWrap.querySelector('h2.sr-only');
  if (existingSrTitle) {
    existingSrTitle.remove();
  }

  const srTitle = document.createElement('h2');
  srTitle.className = 'sr-only';
  srTitle.textContent = lnbTitle.textContent.trim();

  pageTitleWrap.prepend(srTitle);
};

const observeLnbTitle = () => {
  let isSyncing = false;

  const observerCallback = (mutationsList, observer) => {
    if (isSyncing) return;
    isSyncing = true;
    syncLnbTitleToPage();
    setTimeout(() => {
      isSyncing = false;
    }, 10);
  };

  const observerConfig = { childList: true, subtree: true, characterData: true };

  const lnbNode = document.querySelector('#lnb');

  if (lnbNode) {
    const lnbObserver = new MutationObserver(observerCallback);
    lnbObserver.observe(lnbNode, observerConfig);
  }
};

window.addEventListener('load', () => {
  syncLnbTitleToPage();
  setScrollbarWidth();
  observeLnbTitle();
});
window.addEventListener('resize', setScrollbarWidth);
