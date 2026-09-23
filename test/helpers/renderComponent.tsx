import { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * Renders a component the way the app does.
 *
 * Every page and card either navigates or renders a `Link`, so the router is
 * not optional — without it they throw rather than render. MUI needs no
 * provider: it falls back to its default theme, and nothing under test reads a
 * value the app's dark theme overrides.
 */
export const renderComponent = (ui: ReactElement, route = "/") =>
  render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
