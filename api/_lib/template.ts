import { marked } from "marked";
import { sanitizeHtml } from "./sanitizer";
import { ParsedRequest } from "./types";

function getCss(fontSize: string) {
  let background = "white";
  let foreground = "black";

  return `
    @import url('https://fonts.googleapis.com/css2?family=BIZ+UDGothic:wght@400;700&display=swap');
    body {
        background: ${background};
        background-size: 100px 100px;
        height: 100vh;
        display: flex;
        text-align: center;
        align-items: center;
        justify-content: center;
        font-family: 'BIZ UDGothic', sans-serif;
    }

    code {
        color: #D400FF;
        white-space: pre-wrap;
        letter-spacing: -5px;
    }

    code:before, code:after {
        content: '\`';
    }

    .logo-wrapper {
        display: flex;
        align-items: center;
        align-content: center;
        justify-content: center;
        justify-items: center;
    }

    .spacer {
        margin: 150px;
    }

    .emoji {
        height: 1em;
        width: 1em;
        margin: 0 .05em 0 .1em;
        vertical-align: -0.1em;
    }
    
    .heading {
        font-size: ${sanitizeHtml(fontSize)};
        font-style: normal;
        color: ${foreground};
        line-height: 1.8;
        font-family: 'BIZ UDGothic', sans-serif;
    }
    .siteName{
        font-size: 1em;
    }`;
}

export function getHtml(parsedReq: ParsedRequest) {
  const { text, md, fontSize } = parsedReq;
  return `<!DOCTYPE html>
<html>
    <meta charset="utf-8">
    <title>Generated Image</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        ${getCss(fontSize)}
    </style>
    <body>
        <div>
           <div class="heading">
                ${md ? marked(text) : sanitizeHtml(text)}
            </div>
            <div class="siteName">
                https://yukyu.net
            </div>
        </div>
    </body>
</html>`;
}
