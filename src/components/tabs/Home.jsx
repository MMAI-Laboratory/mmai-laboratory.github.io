import "./Home.css";
import HomeResearch from "./HomeResearch";
import {
    HomeCTA,
    HomeLatestNewsList,
    HomePeoplePreview,
    HomeSelectedPublications,
} from "./home/index";

function Home({ handleActiveResearch }) {
    return (
        <div data-reveal data-reveal-load-delay="60" className="home">
            <HomeLatestNewsList />

            <section
                data-reveal
                data-reveal-load-delay="60"
                className="home-block home__research">
                <HomeResearch handleActiveResearch={handleActiveResearch} />
            </section>

            <HomeSelectedPublications />

            <HomePeoplePreview />

            <HomeCTA />
        </div>
    );
}

export default Home;
