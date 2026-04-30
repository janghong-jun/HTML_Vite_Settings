(function (win, doc, undefined) {
  'use strict';

  var $WIN = $(window);
  var $DOC = $(document);

  UI.common = {
    init: function () {
      UI.common.subNav();
      UI.table.scroll();

      // 모달 호출
      const btns = document.querySelectorAll('.btn-modal');

      UI.scrollBar.init({
        callback: function () {
          // console.log('end');
        },
      });

      for (const btn of btns) {
        btn.addEventListener('click', (e) => {
          const el = e.currentTarget;
          const id = el.dataset.id;
          const src = el.dataset.src;

          // callback 함수 필요할경우
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
      }

      UI.datepicker.init({
        id: 'input id name',
        date: 'YYYY-MM-DD',
        min: 'YYYY-MM-DD',
        max: 'YYYY-MM-DD',
        title: 'title name',
        //period: 'start' or 'end',
        // callback: function(){
        // 	console.log('callback init');
        // }
      });

      UI.form.fileUpload();
    },
    subNav: function () {
      if ($('.sub-nav').length > 0) {
        var lnbObj = $('.sub-nav');
        // $('.sub-nav').html($menu);
        var mid = pageInfo.mid,
          sid = !!pageInfo.sid ? pageInfo.sid : '',
          mMenuObj = $('#menu' + mid),
          sMenuObj = mMenuObj
            .next('.sub')
            .find('li')
            .eq(sid - 1);
        mMenuObj.addClass('on');
        mMenuObj.next('.sub').addClass('on');
        sMenuObj.addClass('current');

        $('.sub-nav')
          .find('.mMenu')
          .on('click', function (e) {
            e.preventDefault();
            var subMenu = $(this).closest('li').find('.sub');
            if (subMenu.length > 0 && !!!subMenu.hasClass('on')) {
              $('.nav > li').find('.mMenu').removeClass('on');
              $('.sub').removeClass('on').slideUp(200);

              if (!!!$(this).closest('li').find('.sub').hasClass('on')) {
                $(this).addClass('on');
                subMenu.addClass('on').slideDown(200);
              }
            }
          });
      }
    },
  };

  //기본실행
  doc.addEventListener('DOMContentLoaded', function () {
    UI.common.init();
    const tabs = document.querySelectorAll('.ui-tab[data-id]');

    tabs.forEach((tab) => {
      const id = tab.dataset.id;

      UI.tab.init({
        id,
        current: Number(tab.dataset.current) || 0,
        dynamic: tab.dataset.dynamic === 'true',
      });
    });
  });
})(window, document);

$(document).on('click', '.menu', function () {
  $(this).toggleClass('open');
  $('.sub-nav').toggleClass('is-active');
});
