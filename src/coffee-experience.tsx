import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Coffee } from 'lucide-react';
import copy from '../content/coffee-experience-ar.json';
import { ProductCard, SectionTitle } from './components';
import type { Product } from './lib';
import { matchTasteProducts, type TasteAnswers } from './taste-matching';

const positions = ['100%', '50%', '0%'];
const format = (value: string, answers: TasteAnswers) =>
  value.replace('{brew}', answers.brew).replace('{kind}', answers.kind);

export function TasteQuiz({ products }: { products: Product[] }) {
  const [step, setStep] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    panelRef.current?.focus({ preventScroll: true });
  }, [step]);
  const [answers, setAnswers] = useState<TasteAnswers>({ brew: '', kind: '', usage: '' });
  const question = copy.quiz.questions[step];
  const matches = matchTasteProducts(products, answers);
  const complete = step === copy.quiz.questions.length;
  const restart = () => {
    setStep(0);
    setAnswers({ brew: '', kind: '', usage: '' });
  };
  const weightExplanation =
    answers.usage === 'share'
      ? copy.quiz.result.shareWeightExplanation
      : answers.usage === 'daily'
        ? copy.quiz.result.dailyWeightExplanation
        : copy.quiz.result.tryWeightExplanation;
  return (
    <section className="container section taste-quiz" id="taste-quiz">
      <SectionTitle eyebrow={copy.quiz.eyebrow} title={copy.quiz.title} />
      <p className="section-intro">{copy.quiz.description}</p>
      <div className="quiz-panel" ref={panelRef} tabIndex={-1}>
        {!complete ? (
          <>
            <p className="quiz-progress">
              <strong>{copy.quiz.progressLabel.replace('{current}', String(step + 1))}</strong>
              {copy.quiz.questions.map((item, index) => (
                <span
                  key={item.id}
                  className={index === step ? 'active' : index < step ? 'complete' : ''}
                  aria-hidden="true"
                />
              ))}
            </p>
            <fieldset className="quiz-question">
              <legend>{question.title}</legend>
              <p className="muted">{question.help}</p>
              <div className="quiz-options">
                {question.options.map((option) => {
                  const key = question.id as keyof TasteAnswers;
                  const selected = answers[key] === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`quiz-option ${selected ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={selected}
                        onChange={() =>
                          setAnswers((current) => ({ ...current, [key]: option.value }))
                        }
                      />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                      {selected && <Check size={19} aria-hidden="true" />}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="quiz-actions">
              {step > 0 && (
                <button type="button" className="btn secondary" onClick={() => setStep(step - 1)}>
                  {copy.quiz.backCta}
                </button>
              )}
              <button
                type="button"
                className="btn"
                disabled={!answers[question.id as keyof TasteAnswers]}
                onClick={() => setStep(step + 1)}
              >
                {step === 2 ? copy.quiz.resultCta : copy.quiz.nextCta}
                <ArrowLeft size={17} />
              </button>
            </div>
          </>
        ) : (
          <div className="quiz-result" role="status" aria-live="polite">
            {matches.length ? (
              <>
                <span className="eyebrow">{copy.quiz.result.eyebrow}</span>
                <h3>
                  {matches.length === 1 ? copy.quiz.result.title : copy.quiz.result.multipleTitle}
                </h3>
                <p>
                  {format(
                    answers.kind === 'any'
                      ? copy.quiz.result.openKindExplanation
                      : copy.quiz.result.matchedExplanation,
                    answers,
                  )}
                </p>
                <p>{weightExplanation}</p>
                <div className="quiz-result-products">
                  {matches.slice(0, 2).map(({ product, variant }) => (
                    <ProductCard key={product.id} product={product} variant={variant} />
                  ))}
                </div>
                <p className="tiny muted">{copy.quiz.result.note}</p>
              </>
            ) : (
              <>
                <Coffee size={35} strokeWidth={1.2} aria-hidden="true" />
                <h3>{copy.quiz.empty.title}</h3>
                <p>{copy.quiz.empty.description}</p>
                <Link className="btn" to="/guide">
                  {copy.quiz.empty.guideCta}
                  <ArrowLeft size={17} />
                </Link>
              </>
            )}
            <button type="button" className="text-link quiz-restart" onClick={restart}>
              {copy.quiz.restartCta}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function RecipeCards() {
  return (
    <section className="container section recipe-section" id="recipes">
      <SectionTitle eyebrow={copy.recipes.eyebrow} title={copy.recipes.title} />
      <p className="section-intro">{copy.recipes.intro}</p>
      <div className="recipe-grid">
        {copy.recipes.items.map((recipe, index) => (
          <article className="recipe-card" key={recipe.id} id={`recipe-${recipe.id}`}>
            <div
              className="recipe-photo"
              role="img"
              aria-label={recipe.imageAlt}
              style={{
                backgroundImage: 'url(/images/coffee-recipes.webp)',
                backgroundPositionX: positions[index],
              }}
            />
            <div className="recipe-copy">
              <span className="eyebrow">{recipe.brew}</span>
              <h3>{recipe.title}</h3>
              <p>{recipe.description}</p>
              <details>
                <summary>
                  {copy.recipes.openCta}
                  <ChevronDown size={17} aria-hidden="true" />
                </summary>
                <div className="recipe-details">
                  <p className="tiny muted">
                    {recipe.yield} · الطحنة: {recipe.grind}
                  </p>
                  <h4>{copy.recipes.ingredientsLabel}</h4>
                  <ul>
                    {recipe.ingredients.map((ingredient) => (
                      <li key={ingredient}>{ingredient}</li>
                    ))}
                  </ul>
                  <h4>{copy.recipes.stepsLabel}</h4>
                  <ol>
                    {recipe.steps.map((instruction) => (
                      <li key={instruction}>{instruction}</li>
                    ))}
                  </ol>
                  <p className="recipe-tip">
                    <strong>{copy.recipes.tipLabel}: </strong>
                    {recipe.tip}
                  </p>
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BranchDrinks() {
  return (
    <section className="container section branch-drinks" id="branch-drinks">
      <SectionTitle eyebrow={copy.branchExperience.eyebrow} title={copy.branchExperience.title} />
      <p className="section-intro">{copy.branchExperience.description}</p>
      <div className="branch-drinks-grid">
        {copy.branchExperience.items.map((drink, index) => (
          <article className="branch-drink-card" key={drink.id}>
            <div
              className="branch-drink-photo"
              role="img"
              aria-label={drink.imageAlt}
              style={{
                backgroundImage: 'url(/images/branch-drinks.webp)',
                backgroundPositionX: positions[index],
              }}
            />
            <div className="branch-drink-copy">
              <h3>{drink.title}</h3>
              <p>{drink.description}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="tiny muted drink-image-caption">
        {copy.branchExperience.generatedImageCaption}
      </p>
      <div className="section-action">
        <Link className="btn" to="/branches">
          {copy.branchExperience.cta}
          <ArrowLeft size={17} />
        </Link>
      </div>
    </section>
  );
}
