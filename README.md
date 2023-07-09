# ZachWhitehead.com #



This repository holds the information, structure and design in [www.zachwhitehead.com](http://www.zachwhitehead.com). This is a playground where I play around with some technologies, try to optimize the website with Google Page Speed Insights, or test some gulp scripts.

It's a good excuse to overengineer a CV-website, isn't it? ;-)

### Design ###

<img width="1340" alt="website-screenshot" src="https://user-images.githubusercontent.com/240085/211220892-f1ebeb35-224e-4e2e-925d-c7116527208f.png">

Its theme started based on [Raditian Theme](https://github.com/radity/raditian-free-hugo-theme) - and I evolved it quite deeply, upgrading Bootstrap 4 to 5, removing jQuery as a dependency, ...

As a result, the template in this repo is heavily modified (adding assets pipeline support, some i18n features, additional pages/templates, performance and accessibility improvements...).

You can find the template open sourced independently from this site in https://github.com/zach_whitehead/adritian-free-hugo-theme.

### Generation ###

The content is generated with [Hugo](https://gohugo.io/), a very fast, flexible and tuneable static content generator. It's made with go, the first reason I started to play around with it - later I discovered its power and strong community.

#### Running locally

[Installing Hugo](https://gohugo.io/getting-started/installing/) is a pre-requirement.
After that, the commands from [Hugo CLI](https://gohugo.io/getting-started/usage/) can be used, like `hugo serve`.

### Deployment

The code in this repo is later procesed with Cloudflare - which will generate the HTML with hugo, process the CSS, images and JS with gulp, and export the contents to Vercel.

As simple as it gets!


### More? ###

Do you want some more info about how or why I did some thing on the site? Drop me a line! (the form is connected to [formspree.io](https://formspree.io/) by the way, another great piece of software).
