# summernote-ext-imagealt

Alt text for images in [Summernote](https://summernote.org): describe every
picture for someone who cannot see it, or mark it decorative on purpose.

Summernote's image popover can resize, float and remove a picture, but not
describe it. An image with no alt text fails
[WCAG 1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html):
a screen reader reads its file name or nothing useful. This adds a button to
the image popover (and, if you like, the toolbar) that opens a small dialog
with the image, its alt text, a "decorative" choice and an optional title.

- **Decorative is a choice, not an accident.** It writes `alt=""`, which tells a
  screen reader to skip the image. The dialog will not save a picture with
  neither a description nor that box ticked.
- Works with Summernote lite, bs3, bs4 and bs5 (0.8.18 and later), and jQuery 3.
- One script, one stylesheet, no other dependencies. Translatable.

## Install

```bash
npm install summernote-ext-imagealt
```

or from a CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/summernote-ext-imagealt@0.1/src/summernote-ext-imagealt.css">
<script src="https://cdn.jsdelivr.net/npm/summernote-ext-imagealt@0.1/src/summernote-ext-imagealt.js"></script>
```

Load it after Summernote, then put `imagealt` in the image popover:

```js
$('#editor').summernote({
  popover: {
    image: [
      ['resize', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
      ['float', ['floatLeft', 'floatRight', 'floatNone']],
      ['imagealt', ['imagealt']],
      ['remove', ['removeMedia']]
    ]
  },
  toolbar: [
    ['insert', ['picture', 'imagealt']]   // optional: a toolbar button too
  ]
});
```

Why the whole popover list: Summernote builds the image popover from
`popover.image` before any plugin runs, so a plugin cannot add itself to it.
Passing `popover.image` replaces the default, which is why the default buttons
are listed alongside `imagealt` (as they stand in Summernote 0.9).

## Options

Under `imagealt` in Summernote's options.

| Option | Default | What it does |
|---|---|---|
| `requireAlt` | `true` | Refuse to save with neither a description nor "decorative". Off, an empty box removes the alt attribute instead (never `alt=""`, which would mean decorative). |
| `icon` | an accessibility icon | The button's contents, as HTML. |

## What it writes

| Chosen | Written |
|---|---|
| A description | `alt="…"` (trimmed) |
| Decorative | `alt=""` and `role="presentation"` |
| A title | `title="…"`; an empty title removes the attribute |

Each save is one undo step and fires Summernote's change event, so a textarea
the editor is bound to stays in step.

## Translating

The words are in `$.summernote.lang['en-US'].imagealt`. Add an `imagealt` block
to your language; anything left out falls back to English.

```js
$.extend(true, $.summernote.lang, {
  'fr-FR': { imagealt: { tooltip: 'Texte alternatif', title: "Décrire l'image", save: 'Enregistrer' } }
});
```

## Styling

Every class is `note-imagealt-` prefixed; colors are custom properties on
`.note-imagealt-dialog` (`--note-ia-error`, `--note-ia-muted` and so on).

## Demo and tests

Open `examples/index.html` (any static server), and `npm test` (vitest, jsdom).

## Related

- [summernote-ext-filemanager](https://github.com/kevinbruce/summernote-ext-filemanager): browse and insert files already on your server.
- [summernote-ext-tableprops](https://github.com/kevinbruce/summernote-ext-tableprops): table, row and cell properties.

## License

MIT © Kevin Bruce. Built for, and released with the permission of, Maryland Sea Grant.
