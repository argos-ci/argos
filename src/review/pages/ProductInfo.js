import React from 'react'
import styled, { css } from '@xstyled/styled-components'
import { Box, Text, Button } from '@smooth-ui/core-sc'
import { up, down, variant, th } from '@xstyled/system'

import LayoutBody from 'components/LayoutBody'
import ProductHeader from 'components/ProductHeader'
import GitHubStatus from 'components/GitHubStatus'
import ScrollView from 'components/ScrollView'
import Link from 'modules/components/Link'
import Beast from 'components/Beast'
import build from 'assets/build.png'
import ci from 'assets/ci.png'
import perfect from 'assets/perfect.png'

const StyledBeast = styled(Beast)`
  padding: 24rpx;
  position: absolute;
  bottom: -60%;
  height: 100%;
  right: 0;
  transform: rotate(180deg);
  fill: primary;
  transition: fill 300ms, transform 300ms;
  z-index: 0;

  ${up(
    'md',
    css`
      &:hover {
        transform: rotate(180deg) translateY(5%);
        fill: gray600;
      }
      z-index: 3;
    `,
  )}
`

const StyledProductShowcaseContainer = styled.box`
  padding: 16rpx 0;

  ${up(
    'md',
    css`
      padding: 40rpx 0;
    `,
  )}

  ${variant({
    variants: {
      gray: css`
        background: ${th.color('gray200')};
      `,
      white: css`
        background: darker;
      `,
    },
  })}
`

const StyledFigure = styled.box`
  margin: 0;
  display: flex;
  justify-content: center;
`

const ProductShowcase = ({ description, title, image, textPosition, size }) => {
  const colMd = image ? 5 / 12 : 1
  return (
    <StyledProductShowcaseContainer
      variant={textPosition === 'right' ? 'gray' : 'white'}
    >
      <LayoutBody variant="margin">
        <Box
          row
          flexDirection={textPosition === 'left' ? 'row' : 'row-reverse'}
          m={{ md: -12 }}
        >
          <Box p={{ md: 12 }} col={{ xs: 1, md: colMd }}>
            <Text
              variant={size === 'large' ? 'display1' : 'title'}
              forwardedAs="h3"
              mb={2}
            >
              {title}
            </Text>
            <Text variant="subheading" forwardedAs="p">
              {description}
            </Text>
          </Box>
          {image ? (
            <StyledFigure
              p={{ md: 12 }}
              col={{ xs: 12, md: 7 / 12 }}
              forwardedAs="figure"
            >
              {image}
            </StyledFigure>
          ) : null}
        </Box>
      </LayoutBody>
    </StyledProductShowcaseContainer>
  )
}

const StyledShowcaseImg = styled.img`
  ${variant({
    variants: {
      build: css`
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 4;
        max-height: 298.5rpx; // 2x ratio

        ${up(
          'sm',
          css`
            max-height: 380rpx;
          `,
        )}
      `,
      perfect: css`
        ${down(
          'sm',
          css`
            // 2x ration
            width: 93rpx;
            height: 93rpx;
          `,
        )}
      `,
      ci: css`
        ${down(
          'sm',
          css`
            // 2x ration
            width: 158rpx;
            height: 158rpx;
          `,
        )}
      `,
    },
  })}
`

const ProductInfo = () => (
  <ScrollView>
    <ProductHeader
      display1="Automate visual regression testing"
      headline="Argos's visual regression system gives you high confidence in doing changes."
      beast={<StyledBeast />}
    >
      <Button as="a" href="/auth/github/public">
        Try it
      </Button>
    </ProductHeader>
    <ProductShowcase
      title="Forget about regressions"
      size="large"
      textPosition="left"
      description="
            Argos will warn you if any visual regressions are about to be introduced,
            so they those don't end-up in production.
            We are giving developers high confidence in doing changes so they can quickly iterate.
            You can review visual changes in one click as part of your code review process.
          "
      image={
        <Link href="https://www.argos-ci.com/callemall/material-ui/builds/3176">
          <StyledShowcaseImg src={build} alt="build" variant="build" />
        </Link>
      }
    />
    <ProductShowcase
      title="Save time"
      textPosition="right"
      description="
            Argos compares screenshots at high speed.
            You get a fast feedback.
            It comes with a GitHub integration.
            It will notify you on pull requests when something might be broken.
          "
      image={<GitHubStatus />}
    />
    <ProductShowcase
      title="Integrates in your development workflow"
      textPosition="left"
      description="
            Argos integrates directly into your test suite and development workflow.
            We provide a command line interface streamlining the process.
          "
      image={<StyledShowcaseImg src={ci} alt="ci" variant="ci" />}
    />
    <ProductShowcase
      title="Ship pixel-perfect interfaces"
      textPosition="right"
      description="
            Argos provides different tools to compare screenshots.
            Designers can easily participate in the code review process.
          "
      image={
        <StyledShowcaseImg src={perfect} alt="perfect" variant="perfect" />
      }
    />
    <ProductShowcase
      title="Testing your open source project is 100% free"
      textPosition="left"
      description="
            Seriously. Always. We like to think of it as our way of giving
            back to a community that gives us so much as well.
          "
    />
  </ScrollView>
)

export default ProductInfo
