import styled, { x } from "@xstyled/styled-components";

import { BaseLink } from "./Link";

export const ThumbnailTitle = styled.box`
  overflow: hidden;
  text-align: left;
  color: secondary-text;
  display: flex;
  align-items: flex-end;
  direction: rtl;
  justify-content: flex-end;
  width: 100%;
  font-size: xs;
  line-height: 16px;
  min-height: 32px;
`;

export const ThumbnailImage = ({ image, ...props }) => {
  if (!image?.url) return null;
  return <x.img src={image.url} objectFit="contain" {...props} />;
};

export const Thumbnail = styled(BaseLink)`
  background-color: bg;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2;
  border-radius: base;
  padding: 0;
  cursor: default;
  width: 100%;

  &:hover {
    outline: solid 4px;
    outline-color: slate-700;
  }

  &:focus {
    outline: solid 4px;
    outline-color: sky-900-a70;
  }

  &[data-active="true"] {
    outline: solid 4px;
    outline-color: sky-900;
  }
`;
