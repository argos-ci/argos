import { x } from "@xstyled/styled-components";
import SyntaxHighlighter from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/cjs/styles/hljs";

export const Code = ({ children, language, ...props }) => {
  return (
    <x.div {...props}>
      <SyntaxHighlighter
        language={language}
        style={nightOwl}
        customStyle={{ fontSize: "15px", lineHeight: "24px", padding: 0 }}
      >
        {children}
      </SyntaxHighlighter>
    </x.div>
  );
};
