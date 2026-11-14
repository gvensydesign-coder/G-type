"""Test-only Google Fonts stand-in: the sandbox cannot reach fonts.googleapis.com, so the stylesheet request and the font files are
answered from tests/fixtures (Onest, Playfair Display Italic, both variable TTF). index.html never embeds the fonts."""
import os
FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures')
CSS = ("@font-face{font-family:'Onest';font-style:normal;font-weight:100 900;font-display:swap;src:url(https://fonts.gstatic.com/fx/onest.ttf) format('truetype')}"
       "@font-face{font-family:'Playfair Display';font-style:italic;font-weight:400 900;font-display:swap;src:url(https://fonts.gstatic.com/fx/playfair-i.ttf) format('truetype')}")


def install(ctx):
    """Route-intercept the Google Fonts URLs on a Playwright context or page."""
    def css(route):
        route.fulfill(status=200, content_type='text/css', headers={'access-control-allow-origin': '*'}, body=CSS)

    def font(name):
        def h(route):
            with open(os.path.join(FIX, name), 'rb') as f:
                route.fulfill(status=200, content_type='font/ttf', headers={'access-control-allow-origin': '*'}, body=f.read())
        return h
    ctx.route('https://fonts.googleapis.com/**', css)
    ctx.route('https://fonts.gstatic.com/fx/onest.ttf', font('Onest.ttf'))
    ctx.route('https://fonts.gstatic.com/fx/playfair-i.ttf', font('PlayfairDisplay-Italic.ttf'))
