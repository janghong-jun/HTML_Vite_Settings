/**
 * ui_observer.js
 * DOM 변화 감지 및 자동 초기화 모듈
 * MutationObserver를 사용하여 DOM 변화를 감지하고 필요한 UI 컴포넌트를 자동으로 초기화
 */
(function (win, doc, undefined) {
  'use strict';

  // UI 네임스페이스가 없으면 생성
  if (!win.UI) {
    win.UI = {};
  }

  /**
   * UI Observer 모듈
   * DOM 변화를 감지하고 자동으로 컴포넌트 초기화
   */
  UI.observer = {
    // MutationObserver 인스턴스
    observer: null,

    // 초기화 대상 설정
    targets: [
      {
        selector: '.ui-tab[data-id]',
        init: function (element) {
          const id = element.dataset.id;
          const current = Number(element.dataset.current) || 0;
          const dynamic = element.dataset.dynamic === 'true';

          // 이미 초기화되었는지 체크
          if (!element.hasAttribute('data-initialized')) {
            UI.tab.init({ id, current, dynamic });
            element.setAttribute('data-initialized', 'true');
          }
        },
      },
      {
        selector: '.btn-modal',
        init: function (element) {
          if (!element.hasAttribute('data-listener-added')) {
            element.addEventListener('click', function (e) {
              const el = e.currentTarget;
              const id = el.dataset.id;
              const src = el.dataset.src;

              if (id === 'test') {
                UI.modal.show({
                  id: id,
                  src: src,
                  callback: () => {
                    alert(11);
                    setTimeout(() => {
                      UI.datepicker.init();
                    }, 0);
                  },
                });
              } else {
                UI.modal.show({
                  id: id,
                  src: src,
                  callback: () => {
                    UI.datepicker.init();
                  },
                });
              }
            });
            element.setAttribute('data-listener-added', 'true');
          }
        },
      },
      {
        selector: '[data-datepicker]',
        init: function (element) {
          if (!element.hasAttribute('data-initialized')) {
            const config = {
              id: element.id || element.name,
              date: element.dataset.date,
              min: element.dataset.min,
              max: element.dataset.max,
              title: element.dataset.title,
              period: element.dataset.period,
            };
            UI.datepicker.init(config);
            element.setAttribute('data-initialized', 'true');
          }
        },
      },
      {
        selector: 'input[type="file"]',
        init: function (element) {
          if (!element.hasAttribute('data-initialized') && UI.form && UI.form.fileUpload) {
            UI.form.fileUpload();
            element.setAttribute('data-initialized', 'true');
          }
        },
      },
      {
        selector: '.ui-scrollbar',
        init: function (element) {
          if (!element.hasAttribute('data-initialized')) {
            UI.scrollBar.init();
            element.setAttribute('data-initialized', 'true');
          }
        },
      },
    ],

    /**
     * Observer 초기화
     * @param {Object} options - 설정 옵션
     * @param {Array} options.customTargets - 사용자 정의 초기화 대상 추가
     * @param {HTMLElement} options.rootElement - 감시할 루트 엘리먼트 (기본: document.body)
     * @param {Boolean} options.observeExisting - 기존 요소도 초기화 여부 (기본: true)
     */
    init: function (options = {}) {
      const config = {
        customTargets: options.customTargets || [],
        rootElement: options.rootElement || doc.body,
        observeExisting: options.observeExisting !== false,
      };

      // 사용자 정의 타겟 추가
      if (config.customTargets.length > 0) {
        this.targets = this.targets.concat(config.customTargets);
      }

      // 기존 요소 초기화
      if (config.observeExisting) {
        this.initExistingElements(config.rootElement);
      }

      // MutationObserver 설정
      const observerConfig = {
        childList: true, // 자식 노드의 추가/삭제 감지
        subtree: true, // 하위 모든 노드 감지
        attributes: false, // 속성 변경은 감지하지 않음 (필요시 true로 변경)
      };

      // Observer 콜백 함수
      const callback = (mutationsList, observer) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            // 추가된 노드 처리
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.processNode(node);
              }
            });
          }
        }
      };

      // Observer 생성 및 시작
      this.observer = new MutationObserver(callback);
      this.observer.observe(config.rootElement, observerConfig);

      // console.log('UI Observer initialized');
    },

    /**
     * 기존 DOM 요소들 초기화
     * @param {HTMLElement} rootElement - 검색할 루트 엘리먼트
     */
    initExistingElements: function (rootElement = doc.body) {
      this.targets.forEach((target) => {
        const elements = rootElement.querySelectorAll(target.selector);
        elements.forEach((element) => {
          try {
            target.init(element);
          } catch (error) {
            console.warn(`Failed to initialize existing element: ${target.selector}`, error);
          }
        });
      });
    },

    /**
     * 추가된 노드 처리
     * @param {HTMLElement} node - 처리할 노드
     */
    processNode: function (node) {
      this.targets.forEach((target) => {
        // 노드 자체가 대상인지 확인
        if (node.matches && node.matches(target.selector)) {
          try {
            target.init(node);
          } catch (error) {
            console.warn(`Failed to initialize node: ${target.selector}`, error);
          }
        }

        // 노드의 하위 요소 중 대상이 있는지 확인
        if (node.querySelectorAll) {
          const elements = node.querySelectorAll(target.selector);
          elements.forEach((element) => {
            try {
              target.init(element);
            } catch (error) {
              console.warn(`Failed to initialize child element: ${target.selector}`, error);
            }
          });
        }
      });
    },

    /**
     * 특정 요소에 대해 수동으로 초기화 실행
     * @param {HTMLElement} element - 초기화할 요소
     */
    initElement: function (element) {
      if (element && element.nodeType === Node.ELEMENT_NODE) {
        this.processNode(element);
      }
    },

    /**
     * 새로운 초기화 대상 추가
     * @param {Object} target - 초기화 대상 설정
     * @param {String} target.selector - CSS 선택자
     * @param {Function} target.init - 초기화 함수
     */
    addTarget: function (target) {
      if (target && target.selector && typeof target.init === 'function') {
        this.targets.push(target);
        // 기존 요소들도 초기화
        this.initExistingElements();
      } else {
        console.warn('Invalid target configuration');
      }
    },

    /**
     * Observer 중지
     */
    disconnect: function () {
      if (this.observer) {
        this.observer.disconnect();
        // console.log('UI Observer disconnected');
      }
    },

    /**
     * Observer 재시작
     */
    reconnect: function () {
      if (this.observer) {
        this.disconnect();
        this.init();
      }
    },
  };

  /**
   * 자동 초기화 (DOMContentLoaded 시점)
   */
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', function () {
      // UI.common.init()이 먼저 실행되도록 약간의 지연
      setTimeout(() => {
        UI.observer.init();
      }, 0);
    });
  } else {
    // 이미 로드된 경우 즉시 실행
    setTimeout(() => {
      UI.observer.init();
    }, 0);
  }
})(window, document);
