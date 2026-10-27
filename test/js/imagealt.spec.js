import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import jQuery from 'jquery';

let $;

beforeAll(async () => {
  // Summernote checks which fonts are installed with a canvas as it loads;
  // jsdom has no canvas, so it gets one that measures every font the same.
  HTMLCanvasElement.prototype.getContext = () => ({
    font: '', textAlign: '', textBaseline: '', fillStyle: '',
    fillText() {}, clearRect() {}, measureText: () => ({ width: 10 }),
    getImageData: () => ({ data: [] }),
  });
  // jsdom has no execCommand; Summernote calls it to record an undo step.
  document.execCommand = () => true;
  window.$ = window.jQuery = jQuery;
  $ = jQuery;
  await import('summernote/dist/summernote-lite.js');
  await import('../../src/summernote-ext-imagealt.js');
});

const editors = [];

function editor(html, extra) {
  const $note = $('<div>').html(html || '<p>Reef <img src="/reef.jpg"></p>').appendTo(document.body);
  $note.summernote($.extend({
    toolbar: [['insert', ['imagealt']]],
    popover: { image: [['imagealt', ['imagealt']], ['remove', ['removeMedia']]] },
  }, extra || {}));
  editors.push($note);
  const context = $note.data('summernote');
  const $editable = context.layoutInfo.editable;
  // Selecting a picture: Summernote's image handle records it as the target.
  $editable.data('target', $editable.find('img')[0] || null);
  return { $note, context, plugin: context.modules.imagealt, $editable, $d: () => context.modules.imagealt.$dialog };
}

afterEach(() => {
  vi.restoreAllMocks();
  while (editors.length) {
    const $note = editors.pop();
    $note.summernote('destroy');
    $note.remove();
  }
  $('body').empty();
});

describe('the button', () => {
  it('is offered in the toolbar and the image popover, with its own icon', () => {
    const { $note } = editor();
    const $toolbar = $note.next('.note-editor').find('.note-toolbar');
    expect($toolbar.find('.note-btn svg.note-imagealt-icon').length).toBe(1);
    expect($('.note-image-popover .note-btn svg.note-imagealt-icon').length).toBe(1);
  });
});

describe('the dialog', () => {
  it('shows the selected image and what it already says', () => {
    const { plugin, $d } = editor('<p><img src="/reef.jpg" alt="An oyster reef" title="Reef"></p>');
    plugin.show();
    expect($d().find('.note-imagealt-preview').attr('src')).toBe('/reef.jpg');
    expect($d().find('.note-imagealt-alt').val()).toBe('An oyster reef');
    expect($d().find('.note-imagealt-title').val()).toBe('Reef');
    expect($d().find('.note-imagealt-decorative').prop('checked')).toBe(false);
  });

  it('reads an empty alt as decorative, and no alt as nothing yet', () => {
    const a = editor('<p><img src="/a.png" alt=""></p>');
    a.plugin.show();
    expect(a.$d().find('.note-imagealt-decorative').prop('checked')).toBe(true);
    expect(a.$d().find('.note-imagealt-alt').prop('disabled')).toBe(true);

    const b = editor('<p><img src="/b.png"></p>');
    b.plugin.show();
    expect(b.$d().find('.note-imagealt-decorative').prop('checked')).toBe(false);
    expect(b.$d().find('.note-imagealt-alt').val()).toBe('');
  });

  it('says so when no image is selected', () => {
    const { plugin, $d, $editable } = editor('<p>No pictures here.</p>');
    $editable.data('target', null);
    plugin.show();
    expect($d().find('.note-imagealt-noimage').prop('hidden')).toBe(false);
    expect($d().find('.note-imagealt-form').prop('hidden')).toBe(true);
    expect($d().find('.note-imagealt-save').prop('hidden')).toBe(true);
  });

  it('gives each editor its own field ids, so every label finds its field', () => {
    const a = editor();
    const b = editor();
    const ida = a.$d().find('.note-imagealt-alt').attr('id');
    const idb = b.$d().find('.note-imagealt-alt').attr('id');
    expect(ida).not.toBe(idb);
    expect(a.$d().find('label[for="' + ida + '"]').length).toBe(1);
    expect($('[id="' + ida + '"]').length).toBe(1);
  });
});

describe('saving', () => {
  it('writes the description and the title as one undo step', () => {
    const { context, plugin, $d, $editable } = editor();
    plugin.show();
    const calls = [];
    const real = context.invoke.bind(context);
    vi.spyOn(context, 'invoke').mockImplementation((name, ...args) => { calls.push(name); return name === 'editor.getLastRange' ? real(name, ...args) : undefined; });

    $d().find('.note-imagealt-alt').val('  Volunteers bag oyster shell  ');
    $d().find('.note-imagealt-title').val('Shell recycling');
    expect(plugin.save()).toBe(true);

    const $img = $editable.find('img');
    expect($img.attr('alt')).toBe('Volunteers bag oyster shell');
    expect($img.attr('title')).toBe('Shell recycling');
    expect($img.attr('role')).toBeUndefined();
    expect(calls.filter((c) => c !== 'editor.getLastRange'))
      .toEqual(['editor.beforeCommand', 'editor.afterCommand', 'editor.restoreRange']);
  });

  it('marks a decorative image with an empty alt, never by removing it', () => {
    const { plugin, $d, $editable } = editor('<p><img src="/line.png" alt="old" title="old"></p>');
    plugin.show();
    $d().find('.note-imagealt-decorative').prop('checked', true).trigger('change');
    expect($d().find('.note-imagealt-alt').prop('disabled')).toBe(true);
    $d().find('.note-imagealt-title').val('');
    plugin.save();

    const $img = $editable.find('img');
    expect($img.attr('alt')).toBe('');
    expect($img.attr('role')).toBe('presentation');
    expect($img.attr('title')).toBeUndefined();
  });

  it('will not save neither a description nor decorative', () => {
    const { plugin, $d, $editable } = editor('<p><img src="/a.png" alt="Was described"></p>');
    plugin.show();
    $d().find('.note-imagealt-alt').val('   ');
    expect(plugin.save()).toBe(false);

    expect($d().find('.note-imagealt-error').prop('hidden')).toBe(false);
    expect($d().find('.note-imagealt-error').text()).toBe('Write a description, or mark the image decorative.');
    expect($editable.find('img').attr('alt')).toBe('Was described');

    $d().find('.note-imagealt-alt').val('A').trigger('input');
    expect($d().find('.note-imagealt-error').prop('hidden')).toBe(true);
  });

  it('with requireAlt off, leaves no alt rather than an empty one nobody chose', () => {
    const { plugin, $d, $editable } = editor('<p><img src="/a.png" alt="x"></p>', { imagealt: { requireAlt: false } });
    plugin.show();
    $d().find('.note-imagealt-alt').val('');
    expect(plugin.save()).toBe(true);
    expect($editable.find('img')[0].hasAttribute('alt')).toBe(false);
  });

  it('saves to the image it opened on, after Summernote forgets its selection', () => {
    const { plugin, $d, $editable } = editor();
    plugin.show();
    $editable.removeData('target'); // the editable lost focus to the dialog
    $d().find('.note-imagealt-alt').val('A reef');
    expect(plugin.save()).toBe(true);
    expect($editable.find('img').attr('alt')).toBe('A reef');
  });

  it('closes quietly when the image has gone', () => {
    const { plugin, $editable } = editor();
    plugin.show();
    $editable.data('target', null);
    $editable.find('img').remove();
    expect(plugin.save()).toBe(false);
  });
});

describe('language', () => {
  it('takes its words from the editor language', () => {
    $.summernote.lang['fr-FR'] = $.extend(true, {}, $.summernote.lang['en-US'], {
      imagealt: { title: "Décrire l'image", save: 'Enregistrer' },
    });
    const { $d } = editor(null, { lang: 'fr-FR' });
    expect($d().find('.note-imagealt-save').text()).toBe('Enregistrer');
    expect($d().text()).toContain("Décrire l'image");
  });
});
