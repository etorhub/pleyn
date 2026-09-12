/**
 * Sign-in is its own page, outside the shell.
 *
 * It cannot use `Layout`: there is no user to put in the sidebar and no
 * counter to draw. `auth.fragment.ts` renders the whole document.
 */

export { SignInPage } from "./auth.fragment.ts";
