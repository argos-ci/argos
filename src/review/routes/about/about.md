## The story

Argos-CI was conceived in 2017 with a simple aim of helping front-end teams quickly iterating.
We automate visual regression testing.
We are giving developers high confidence in doing changes.

This project was developed from our realization as front-end developers:
- At [@doctolib](https://github.com/doctolib), we were sharing components between 4 differents applications to increase code reuse but we had no way to quickly and safely iterate on them.
We were constantly releasing visual regressions.
How can a back-end developer or a new joiner safely iterate on the front-end while
the ones who wrote the code can't?
- At [@Material-UI](https://github.com/callemall/material-ui), we realized that our problem wasn't scoped to [@doctolib](https://github.com/doctolib).
How can we ensure that 500+ contributors can safely submit pull requests without introducing breaking changes while maintainer who are supposed to know the code best can't?

It's 100% open source.
All features are built in the open and can be followed and contributed to on [GitHub](https://github.com/argos-ci/argos).
Each month we process 100k+ screenshots.

<!--

SELECT count(*), EXTRACT(MONTH FROM "createdAt") FROM screenshot_diffs GROUP BY date_part order by date_part DESC;
-->

## Our Mission

Argos-CI's mission is to give developers the insight needed to quickly iterating on UIs.

## Our Team

We are a devoted group of creative people. This stuff is our passion.

### Greg Bergé ([@neoziro](https://github.com/neoziro))

[![avatar](https://avatars3.githubusercontent.com/u/266302?s=96)](https://github.com/neoziro)

Co-Founder, Author of [Shipit](https://github.com/neoziro/shipit) and [Recompact](https://github.com/neoziro/recompact). JavaScript and [@reactjs](https://twitter.com/reactjs) lover.

### Olivier Tassinari ([@oliviertassinari](https://github.com/oliviertassinari))

[![avatar](https://avatars1.githubusercontent.com/u/3165635?s=96)](https://github.com/oliviertassinari)

Co-Founder, Software engineer, a maintainer of [@Material-UI](https://github.com/callemall/material-ui), Studied [@TelecomPTech](https://twitter.com/TelecomPTech)
