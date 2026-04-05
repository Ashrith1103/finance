import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders finance dashboard heading", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", {
      name: /see your money flow in one calm, focused space/i
    })
  ).toBeInTheDocument();
});
