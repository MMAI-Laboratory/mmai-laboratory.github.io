import { getPublicationFigure } from "../../assets/images/publications/publication_figure_index";

export default function PublicationFigure({
    publicationId,
    title = "",
    className,
    sizes,
}) {
    const figure = getPublicationFigure(publicationId);
    // Uploaded figures carry no description of their own.
    const alt =
        figure?.alt || (title ? `Figure from ${title}` : "Publication figure");

    return (
        <figure
            className={`${className} publication-figure`}
            data-publication-figure={figure?.figureLabel || undefined}>
            {figure ? (
                <img
                    src={figure.image}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    sizes={sizes}
                />
            ) : (
                <div className="publication-figure__placeholder">
                    Figure unavailable
                </div>
            )}
        </figure>
    );
}
