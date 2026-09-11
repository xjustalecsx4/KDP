export function BookshelfArt({ theme = "reading" }: { theme?: string }) {
  return (
    <div
      className={"shelf-art " + theme}
      role="img"
      aria-label="Ilustrație decorativă: cărți, plante și o fereastră arcuită"
    >
      <div className="shelf-window">
        <span />
        <span />
      </div>
      <div className="shelf-sun" />
      <div className="shelf-plant">
        ✳<i />
      </div>
      <div className="shelf-books">
        <div className="drawn-book book-one">
          <span>
            little
            <br />
            moments
          </span>
          <i>✳</i>
        </div>
        <div className="drawn-book book-two">
          <span>
            THE ART OF
            <br />
            SLOW DAYS
          </span>
          <i>☼</i>
        </div>
        <div className="drawn-book book-three">
          <span>
            notes
            <br />& dreams
          </span>
        </div>
      </div>
      <div className="shelf-table" />
      <div className="shelf-cup" />
    </div>
  );
}
