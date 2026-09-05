import ClientRuntime from './ClientRuntime';
import PageBody from './sections/generated/PageBody';

/**
 * The homepage.
 *
 * `PageBody` is generated from the scraped markup (`npm run codegen`) and is a
 * server component, so the page is delivered as fully-rendered HTML the way
 * Webflow's static export is. `ClientRuntime` renders nothing and only starts
 * the ported behaviour scripts.
 */
export default function Home() {
  return (
    <>
      <PageBody />
      <ClientRuntime />
    </>
  );
}
