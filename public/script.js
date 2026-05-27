//Configuração da API
const API_KEY  = "885c727d25e2c2da0e193cab83e89ca3";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL  = "https://image.tmdb.org/t/p/w500";
const LANG     = "pt-BR";

//Estado da aplicação
let currentEndpoint = "popular"; //endpoint ativo no momento
let currentQuery    = "";        //última busca digitada

//Referências ao DOM
const movieList    = document.getElementById("movie-list");
const messageEl    = document.getElementById("message");
const searchInput  = document.getElementById("search");
const btnSearch    = document.getElementById("btnSearch");
const tabs         = document.querySelectorAll(".tab");
const sectionTitle = document.getElementById("section-title");

//Mapeamento de rótulos dos endpoints
const ENDPOINT_LABELS = {
  popular:     "Populares",
  top_rated:   "Mais Votados",
  now_playing: "Em Cartaz",
  upcoming:    "Em Breve",
};

//Funções principais
/**
 * Busca filmes na API do TMDB.
 * Se `query` for fornecida, usa o endpoint de busca por texto.
 * Caso contrário, usa o endpoint de listagem (popular, top_rated, etc.).
 *
 * @param {string} query - Termo de busca (opcional)
 * @param {string} endpoint - Endpoint de listagem (popular, top_rated…)
 * @returns {Promise<Array>} Array de objetos de filme
 */
async function fetchMovies(query = "", endpoint = "popular") {
  let url;

  if (query.trim()) {
    // Pesquisa por nome
    url = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=${LANG}&query=${encodeURIComponent(query)}&page=1`;
  } else {
    // Listagem por categoria
    url = `${BASE_URL}/movie/${endpoint}?api_key=${API_KEY}&language=${LANG}&page=1`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.results; // array de filmes
}

/**
 * Cria e retorna um elemento de card de filme.
 *
 * @param {Object} movie - Objeto de filme retornado pela API
 * @param {number} index - Índice para animação escalonada
 * @returns {HTMLElement} O card do filme
 */
function createMovieCard(movie, index = 0) {
  const card = document.createElement("article");
  card.classList.add("movie-card");
  card.setAttribute("role", "listitem");
  card.style.animationDelay = `${index * 40}ms`;

  //Dados do filme
  const title    = movie.title || "Sem título";
  const year     = movie.release_date ? movie.release_date.slice(0, 4) : "—";
  const rating   = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
  const overview = movie.overview || "Sem sinopse disponível.";
  const posterSrc = movie.poster_path
    ? `${IMG_URL}${movie.poster_path}`
    : null;

  //Cor da nota
  const ratingClass = !movie.vote_average
    ? ""
    : movie.vote_average >= 7.5 ? "rating-high"
    : movie.vote_average >= 5   ? "rating-mid"
    :                              "rating-low";

  //Poster ou placeholder
  const posterHTML = posterSrc
    ? `<img
         class="movie-card__img"
         src="${posterSrc}"
         alt="Poster de ${title}"
         loading="lazy"
       />`
    : `<div class="movie-card__no-poster" aria-hidden="true">🎬</div>`;

  card.innerHTML = `
    <div class="movie-card__poster">
      ${posterHTML}
      <div class="movie-card__rating">
        <span class="rating-star">★</span>
        <span class="${ratingClass}">${rating}</span>
      </div>
    </div>
    <div class="movie-card__body">
      <h2 class="movie-card__title">${title}</h2>
      <div class="movie-card__meta">
        <span class="movie-card__year">${year}</span>
        <span>${movie.original_language?.toUpperCase() || ""}</span>
      </div>
      <p class="movie-card__overview">${overview}</p>
      <button class="btn-details">Mais detalhes</button>
    </div>
  `;

  //Abre modal ao clicar no botão
  card.querySelector(".btn-details").addEventListener("click", (e) => {
    e.stopPropagation();
    openModal(movie);
  });

  return card;
}

/**
 * Renderiza a lista de filmes no container.
 * Limpa o container antes de inserir os novos cards.
 *
 * @param {Array} movies - Array de filmes a renderizar
 */
function renderMovies(movies) {
  movieList.innerHTML = "";

  if (!movies || movies.length === 0) {
    movieList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🎭</div>
        <p class="empty-state__text">Nenhum filme encontrado.</p>
      </div>
    `;
    return;
  }

  //Cria e appenda cada card, com índice para animação escalonada
  movies.forEach((movie, index) => {
    const card = createMovieCard(movie, index);
    movieList.appendChild(card);
  });
}

/**
 * Exibe mensagens de estado (carregando, erro, vazio).
 *
 * @param {string} text    - Texto da mensagem
 * @param {string} type    - Tipo: "" | "loading" | "error"
 */
function showMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className   = `message ${type}`.trim();
}

/**
 * Renderiza cards esqueleto enquanto os dados carregam.
 */
function renderSkeletons(count = 10) {
  movieList.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const sk = document.createElement("div");
    sk.innerHTML = `
      <div class="skeleton" style="aspect-ratio:2/3;border-radius:12px;margin-bottom:8px;"></div>
      <div class="skeleton" style="height:16px;border-radius:6px;width:80%;margin-bottom:6px;"></div>
      <div class="skeleton" style="height:12px;border-radius:6px;width:50%;"></div>
    `;
    movieList.appendChild(sk);
  }
}

/**
 * Atualiza o título da seção de acordo com o estado atual.
 */
function updateTitle() {
  if (currentQuery.trim()) {
    sectionTitle.innerHTML = `Resultados para <span>"${currentQuery}"</span>`;
  } else {
    sectionTitle.innerHTML = ENDPOINT_LABELS[currentEndpoint] || currentEndpoint;
  }
}

//Função orquestradora
/**
 * Carrega e renderiza os filmes, tratando estados de carregamento e erro.
 */
async function loadMovies() {
  showMessage("Carregando...", "loading");
  renderSkeletons(10);
  updateTitle();

  try {
    const movies = await fetchMovies(currentQuery, currentEndpoint);
    renderMovies(movies);

    const count = movies?.length ?? 0;
    showMessage(count > 0 ? `${count} filmes encontrados` : "");
  } catch (error) {
    console.error("Erro ao buscar filmes:", error);
    movieList.innerHTML = "";
    showMessage(`Erro ao carregar filmes: ${error.message}`, "error");
  }
}

//Modal de detalhes
/**
 * Busca detalhes completos de um filme (gêneros, duração, etc.)
 * @param {number} id - ID do filme
 * @returns {Promise<Object>}
 */
async function fetchMovieDetails(id) {
  const url = `${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=${LANG}&append_to_response=credits`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar os detalhes.");
  return response.json();
}

/**
 * Abre o modal com os detalhes do filme.
 * @param {Object} movie - Objeto básico do filme (do card)
 */
async function openModal(movie) {
  //Remove modal anterior se existir
  closeModal();

  const overlay = document.createElement("div");
  overlay.classList.add("modal-overlay");
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Detalhes do filme">
      <button class="modal__close" aria-label="Fechar">✕</button>
      <div class="modal__loading">Carregando detalhes...</div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  //Fecha ao clicar fora
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  //Fecha com ESC
  document.addEventListener("keydown", handleEsc);

  overlay.querySelector(".modal__close").addEventListener("click", closeModal);

  //Busca detalhes e renderiza
  try {
    const details = await fetchMovieDetails(movie.id);

    const posterSrc = details.poster_path
      ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
      : null;

    const backdropSrc = details.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
      : null;

    const genres   = details.genres?.map(g => g.name).join(", ") || "—";
    const runtime  = details.runtime ? `${details.runtime} min` : "—";
    const rating   = details.vote_average ? details.vote_average.toFixed(1) : "N/A";
    const votes    = details.vote_count ? details.vote_count.toLocaleString("pt-BR") : "—";
    const year     = details.release_date ? details.release_date.slice(0, 4) : "—";
    const budget   = details.budget ? `R$ ${details.budget.toLocaleString("pt-BR")}` : "—";
    const overview = details.overview || "Sem sinopse disponível.";

    //Elenco (até 6 atores)
    const cast = details.credits?.cast?.slice(0, 6)
      .map(a => a.name).join(", ") || "—";

    const modal = overlay.querySelector(".modal");
    modal.innerHTML = `
      <button class="modal__close" aria-label="Fechar">✕</button>
      ${backdropSrc ? `<div class="modal__backdrop" style="background-image:url('${backdropSrc}')"></div>` : ""}
      <div class="modal__content">
        <div class="modal__poster-col">
          ${posterSrc
            ? `<img class="modal__poster" src="${posterSrc}" alt="Poster de ${details.title}" />`
            : `<div class="modal__no-poster">🎬</div>`}
        </div>
        <div class="modal__info">
          <h2 class="modal__title">${details.title}</h2>
          ${details.tagline ? `<p class="modal__tagline">"${details.tagline}"</p>` : ""}
          <div class="modal__badges">
            <span class="badge badge--gold">★ ${rating}</span>
            <span class="badge">${votes} votos</span>
            <span class="badge">${year}</span>
            <span class="badge">${runtime}</span>
          </div>
          <div class="modal__section">
            <span class="modal__label">Gêneros</span>
            <span>${genres}</span>
          </div>
          <div class="modal__section">
            <span class="modal__label">Sinopse</span>
            <p class="modal__overview">${overview}</p>
          </div>
          <div class="modal__section">
            <span class="modal__label">Elenco principal</span>
            <span>${cast}</span>
          </div>
          <div class="modal__section">
            <span class="modal__label">Orçamento</span>
            <span>${budget}</span>
          </div>
        </div>
      </div>
    `;

    modal.querySelector(".modal__close").addEventListener("click", closeModal);

  } catch (err) {
    overlay.querySelector(".modal__loading").textContent = "Erro ao carregar detalhes.";
  }
}

/**Fecha e remove o modal do DOM*/
function closeModal() {
  const existing = document.querySelector(".modal-overlay");
  if (existing) existing.remove();
  document.body.style.overflow = "";
  document.removeEventListener("keydown", handleEsc);
}

function handleEsc(e) {
  if (e.key === "Escape") closeModal();
}

//Inicialização
/**
 * Configura os event listeners e dispara o carregamento inicial.
 */
function init() {
  //Busca ao clicar no botão
  btnSearch.addEventListener("click", () => {
    currentQuery = searchInput.value.trim();
    loadMovies();
  });

  //Busca ao pressionar Enter
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      currentQuery = searchInput.value.trim();
      loadMovies();
    }
  });

  //Limpa query ao apagar o campo (volta para listagem da categoria)
  searchInput.addEventListener("input", () => {
    if (searchInput.value === "") {
      currentQuery = "";
      loadMovies();
    }
  });

  //Troca de aba/categoria
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      //Atualiza aba ativa visualmente
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      //Reseta busca e endpoint
      currentEndpoint = tab.dataset.endpoint;
      currentQuery    = "";
      searchInput.value = "";

      loadMovies();
    });
  });

  //Carga inicial
  loadMovies();
}

//Inicia a aplicação quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", init);
