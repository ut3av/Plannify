import '@testing-library/jest-dom';

jest.mock('react-markdown', () => {
  return function DummyMarkdown({ children }) {
    return <div>{children}</div>;
  };
}, { virtual: true });

jest.mock('remark-gfm', () => () => {}, { virtual: true });

jest.mock('@splinetool/react-spline', () => {
  return function DummySpline() {
    return <div data-testid="spline-mock" />;
  };
}, { virtual: true });

