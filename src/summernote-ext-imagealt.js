/**
 * summernote-ext-imagealt
 *
 * Alt text and a title for images in Summernote, so every picture can be
 * described for someone who cannot see it, or marked decorative on purpose.
 *
 * Summernote's image popover can resize, float and remove a picture, but not
 * describe it. An image with no alt text fails WCAG 1.1.1: a screen reader
 * reads its file name, or nothing useful at all. This adds a button for the
 * image popover (and the toolbar) that opens a small dialog:
 *
 *   - Alt text: a description, or
 *   - Decorative: an empty alt, which tells a screen reader to skip it.
 *
 * It will not save a picture with neither, because an empty alt that nobody
 * chose is a decorative image by accident.
 *
 *     $('#editor').summernote({
 *       popover: { image: [ ...the defaults..., ['imagealt', ['imagealt']] ] },
 *       toolbar: [['insert', ['picture', 'imagealt']]]
 *     });
 *
 * Depends on jQuery and Summernote (lite, bs3, bs4 or bs5). MIT licensed.
 * https://github.com/kevinbruce/summernote-ext-imagealt
 */
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('jquery'));
  } else {
    factory(window.jQuery);
  }
}(function ($) {
  'use strict';

  if (!$ || !$.summernote) {
    return;
  }

  // An icon of its own (a person in a circle, the accessibility mark): the
  // plugin should not depend on Font Awesome or any icon font.
  var ICON = '<svg class="note-imagealt-icon" viewBox="0 0 16 16" width="1em" height="1em" ' +
    'aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 ' +
    '1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM8 3a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 8 3zM4.6 6.1a.75.75 ' +
    '0 0 0-.2 1.5l2.35.55V9.3l-1.1 3.15a.75.75 0 1 0 1.42.5L8 10.4l.93 2.55a.75.75 0 1 0 1.42-.5L9.25 ' +
    '9.3V8.15l2.35-.55a.75.75 0 1 0-.35-1.46L8 6.9l-3.25-.77a.76.76 0 0 0-.15-.03z"/></svg>';

  $.extend(true, $.summernote.lang, {
    'en-US': {
      imagealt: {
        tooltip: 'Alt text',
        title: 'Describe this image',
        noImage: 'Select an image first.',
        alt: 'Alt text',
        altPlaceholder: 'What does this image show?',
        altHelp: 'Describe the image for someone who cannot see it. One sentence is usually enough.',
        decorative: 'This image is decorative',
        decorativeHelp: 'Sets an empty alt, so a screen reader skips the image. Only right when it adds nothing the text around it does not already say.',
        imageTitle: 'Title (optional)',
        imageTitleHelp: 'Shown as a tooltip on hover. Not a substitute for alt text: most screen readers ignore it.',
        needOne: 'Write a description, or mark the image decorative.',
        save: 'Save'
      }
    }
  });

  var DEFAULTS = {
    icon: ICON,         // the button's contents (HTML)
    requireAlt: true    // refuse to save with neither a description nor "decorative"
  };

  var counter = 0;      // ids unique per editor, so each label finds its own field

  $.extend($.summernote.plugins, {
    imagealt: function (context) {
      var self = this;
      var ui = $.summernote.ui;
      var options = context.options;
      var settings = $.extend({}, DEFAULTS, options.imagealt || {});
      var lang = $.extend({}, $.summernote.lang['en-US'].imagealt,
        (options.langInfo && options.langInfo.imagealt) || {});
      var $editable = context.layoutInfo.editable;
      var id = 'note-imagealt-' + (++counter);

      context.memo('button.imagealt', function () {
        return ui.button({
          contents: settings.icon,
          tooltip: lang.tooltip,
          click: function () {
            context.invoke('editor.saveRange');
            self.show();
          }
        }).render();
      });

      /**
       * The image being described: the one Summernote's image handle has
       * selected, the editable's 'target', or else one in the last range.
       */
      this.image = function () {
        var handled = context.layoutInfo.editor.find('.note-control-selection').data('target');
        if (handled && handled.length && handled.is('img') && $.contains($editable[0], handled[0])) {
          return handled;
        }
        var target = $editable.data('target');
        if (target && target.tagName === 'IMG') {
          return $(target);
        }
        var rng = context.invoke('editor.getLastRange');
        if (rng && rng.commonAncestor) {
          var $node = $(rng.commonAncestor());
          var $img = $node.is('img') ? $node : $node.find('img').first();
          if ($img.length) {
            return $img;
          }
        }
        return null;
      };

      this.initialize = function () {
        var $container = options.dialogsInBody ? $(document.body) : context.layoutInfo.editor;

        var $body = $('<div class="note-imagealt">');
        $('<p class="note-imagealt-noimage" hidden>').text(lang.noImage).appendTo($body);
        var $form = $('<div class="note-imagealt-form">').appendTo($body);
        $('<img class="note-imagealt-preview" alt="">').appendTo($form);

        var $alt = $('<div class="note-imagealt-field">').appendTo($form);
        $('<label>').attr('for', id + '-alt').text(lang.alt).appendTo($alt);
        $('<textarea class="note-imagealt-alt form-control note-input" rows="2">')
          .attr({ id: id + '-alt', placeholder: lang.altPlaceholder, 'aria-describedby': id + '-althelp' }).appendTo($alt);
        $('<p class="note-imagealt-help">').attr('id', id + '-althelp').text(lang.altHelp).appendTo($alt);

        var $dec = $('<div class="note-imagealt-field">').appendTo($form);
        $('<label class="note-imagealt-check">')
          .append($('<input type="checkbox" class="note-imagealt-decorative">').attr({ id: id + '-dec', 'aria-describedby': id + '-dechelp' }))
          .append(document.createTextNode(' ' + lang.decorative))
          .appendTo($dec);
        $('<p class="note-imagealt-help">').attr('id', id + '-dechelp').text(lang.decorativeHelp).appendTo($dec);

        var $title = $('<div class="note-imagealt-field">').appendTo($form);
        $('<label>').attr('for', id + '-title').text(lang.imageTitle).appendTo($title);
        $('<input type="text" class="note-imagealt-title form-control note-input">')
          .attr({ id: id + '-title', 'aria-describedby': id + '-titlehelp' }).appendTo($title);
        $('<p class="note-imagealt-help">').attr('id', id + '-titlehelp').text(lang.imageTitleHelp).appendTo($title);

        $('<p class="note-imagealt-error" role="alert" hidden>').text(lang.needOne).appendTo($form);

        var $footer = $('<div>');
        $('<button type="button" class="btn btn-primary note-btn note-btn-primary note-imagealt-save">')
          .text(lang.save).appendTo($footer);

        this.$dialog = ui.dialog({
          className: 'note-imagealt-dialog',
          title: lang.title,
          fade: options.dialogsFade,
          body: $body.prop('outerHTML'),
          footer: $footer.html()
        }).render().appendTo($container);

        this.$dialog.on('click', '.note-imagealt-save', function () {
          self.save();
        });

        // Decorative and a description exclude each other, and the dialog
        // shows it rather than dropping one of them on save.
        this.$dialog.on('change', '.note-imagealt-decorative', function () {
          var on = $(this).is(':checked');
          self.$dialog.find('.note-imagealt-alt').prop('disabled', on);
          self.$dialog.find('.note-imagealt-error').prop('hidden', true);
        });
        this.$dialog.on('input', '.note-imagealt-alt', function () {
          self.$dialog.find('.note-imagealt-error').prop('hidden', true);
        });
      };

      this.destroy = function () {
        if (this.$dialog) {
          ui.hideDialog(this.$dialog);
          this.$dialog.remove();
          this.$dialog = null;
        }
      };

      this.show = function () {
        var $d = this.$dialog;
        // Held for the save: opening the dialog moves focus, and Summernote
        // forgets its selected image as soon as the editable loses it.
        var $img = this.$img = this.image();

        $d.find('.note-imagealt-noimage').prop('hidden', !!$img);
        $d.find('.note-imagealt-form, .note-imagealt-save').prop('hidden', !$img);
        $d.find('.note-imagealt-error').prop('hidden', true);

        if ($img) {
          var alt = $img.attr('alt');
          // An empty alt is a real value, "decorative", and differs from none.
          var decorative = alt === '';
          $d.find('.note-imagealt-preview').attr('src', $img.attr('src'));
          $d.find('.note-imagealt-alt').val(alt || '').prop('disabled', decorative);
          $d.find('.note-imagealt-decorative').prop('checked', decorative);
          $d.find('.note-imagealt-title').val($img.attr('title') || '');
        }

        ui.showDialog($d);
        // Popovers close on this; showDialog() fires nothing itself, and the
        // image popover would otherwise sit over the dialog.
        context.triggerEvent('dialog.shown');
        setTimeout(function () { $d.find('.note-imagealt-alt').trigger('focus'); }, 200);
      };

      /** @return {boolean} whether it saved */
      this.save = function () {
        var $d = this.$dialog;
        var $img = this.$img && $.contains($editable[0], this.$img[0]) ? this.$img : null;

        if (!$img) {
          ui.hideDialog($d);
          return false;
        }

        var decorative = $d.find('.note-imagealt-decorative').is(':checked');
        var alt = $.trim($d.find('.note-imagealt-alt').val() || '');

        if (!decorative && !alt && settings.requireAlt) {
          $d.find('.note-imagealt-error').prop('hidden', false);
          $d.find('.note-imagealt-alt').trigger('focus');
          return false;
        }

        // One undo step, and afterCommand fires the change that syncs a textarea.
        context.invoke('editor.beforeCommand');

        if (decorative) {
          // Present and empty. Removing the attribute instead would make a
          // screen reader announce the file name.
          $img.attr('alt', '');
          $img.attr('role', 'presentation');
        } else if (alt) {
          $img.attr('alt', alt);
          $img.removeAttr('role');
        } else {
          // Nothing chosen (requireAlt off): no alt at all, never an empty one
          // that would say "decorative" on nobody's say-so.
          $img.removeAttr('alt');
          $img.removeAttr('role');
        }

        var title = $.trim($d.find('.note-imagealt-title').val() || '');
        if (title) {
          $img.attr('title', title);
        } else {
          $img.removeAttr('title');
        }

        context.invoke('editor.afterCommand');
        ui.hideDialog($d);
        context.invoke('editor.restoreRange');
        return true;
      };
    }
  });

  $.summernote.imagealt = { defaults: DEFAULTS };
}));
