import { syncNewsContent } from "./news.mjs";
import { syncPeopleImages } from "./people.mjs";
import { syncPublicationContent } from "./publications.mjs";
import { syncPhotoContent } from "./photos.mjs";
import { validateResearchContent } from "./research.mjs";

const run = async () => {
    await validateResearchContent();
    const publicationItems = await syncPublicationContent();
    await syncNewsContent({ publicationItems });
    await syncPhotoContent();
    await syncPeopleImages();
    console.log("[content] sync completed");
};

run().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
