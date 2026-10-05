import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Coffee,
  Bean,
  Package,
  Droplets,
  Gauge,
  Users,
  Sparkles,
} from 'lucide-react';
import './coffee-quiz.css';
import { useSiteContent } from './site-content';
import { ProductCard, SectionTitle } from './components';
import type { Product } from './lib';
import { matchTasteProducts, type TasteAnswers } from './taste-matching';

const positions = ['100%', '50%', '0%'];
const format = (value: string, answers: TasteAnswers) =>
  value.replace('{brew}', answers.brew).replace('{kind}', answers.kind);

export function TasteQuiz({
  products,
  standalone = false,
}: {
  products: Product[];
  standalone?: boolean;
}) {
  const { experience: copy, home } = useSiteContent();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<TasteAnswers>({ brew: '', kind: '', usage: '' });
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    panelRef.current?.focus({ preventScroll: true });
  }, [step]);
  const complete = step === copy.quiz.questions.length;
  const question = copy.quiz.questions[step];
  const matches = matchTasteProducts(products, answers);
  const labels = ['طريقة التحضير', 'نوع البن', 'الكمية'];
  const icons = [
    [Coffee, Gauge, Droplets],
    [Bean, Sparkles, Coffee],
    [Package, Coffee, Users],
  ];
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
  const summary = copy.quiz.questions.flatMap((item, index) => {
    if (!complete && index >= step) return [];
    const option = item.options.find(
      (option) => option.value === answers[item.id as keyof TasteAnswers],
    );
    return option ? [{ id: item.id, label: labels[index], value: option.label }] : [];
  });
  return (
    <section className="container section taste-quiz" id="taste-quiz">
      {standalone ? (
        <div className="section-heading">
          <div>
            <span className="eyebrow">{copy.quiz.eyebrow}</span>
            <h1>{copy.quiz.title}</h1>
          </div>
        </div>
      ) : (
        <SectionTitle eyebrow={copy.quiz.eyebrow} title={copy.quiz.title} />
      )}
      <p className="section-intro">اختار طريقتك وذوقك في ٣ خطوات، ونرشّح لك من البن المتاح.</p>
      <div
        className="quiz-panel"
        ref={panelRef}
        tabIndex={-1}
        aria-label={complete ? 'نتيجة اختيار القهوة' : `السؤال ${step + 1} من ٣`}
      >
        <ol className="quiz-stepper" aria-label="خطوات اختيار القهوة">
          {labels.map((label, index) => (
            <li
              key={label}
              className={complete || index < step ? 'complete' : index === step ? 'active' : ''}
              aria-current={!complete && index === step ? 'step' : undefined}
            >
              <span className="quiz-step-circle" aria-hidden="true">
                {complete || index < step ? <Check size={17} /> : index + 1}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
        <div className="quiz-answer-summary" aria-label="اختياراتك السابقة">
          {summary.map((item) => (
            <span className="quiz-answer-chip" key={item.id}>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </span>
          ))}
        </div>
        {!complete ? (
          <>
            <div className="quiz-question-body">
              <fieldset className="quiz-question">
                <legend>{question.title}</legend>
                <p className="muted">{question.help}</p>
                <div className="quiz-options">
                  {question.options.map((option, index) => {
                    const key = question.id as keyof TasteAnswers;
                    const selected = answers[key] === option.value;
                    const Icon = icons[step][index];
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
                        <span className="quiz-option-icon">
                          <Icon size={29} strokeWidth={1.5} aria-hidden="true" />
                        </span>
                        <span className="quiz-option-copy">
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                        <span className="quiz-option-check" aria-hidden="true">
                          {selected && <Check size={14} />}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
            <div className="quiz-actions">
              <div className="quiz-back-slot">
                {step > 0 && (
                  <button type="button" className="btn secondary" onClick={() => setStep(step - 1)}>
                    <ArrowRight size={17} />
                    رجوع
                  </button>
                )}
              </div>
              <button
                type="button"
                className="btn quiz-next"
                disabled={!answers[question.id as keyof TasteAnswers]}
                onClick={() => setStep(step + 1)}
              >
                {step === 2 ? 'شوف الترشيح' : 'التالي'}
                <ArrowLeft size={17} />
              </button>
            </div>
          </>
        ) : (
          <div className="quiz-result" aria-live="polite">
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
                <div className="quiz-result-products">
                  {matches.slice(0, 2).map(({ product, variant }) => (
                    <div className="quiz-recommendation" key={product.id}>
                      <ProductCard product={product} variant={variant} />
                      <div className="quiz-recommendation-meta">
                        <span>
                          <strong>الوزن المقترح:</strong> {variant.weight} جم
                        </span>
                        <span>
                          <strong>الطحنات المتاحة:</strong> {product.grinds.join(' · ')}
                        </span>
                        {product.demo && (
                          <span className="quiz-demo-note">
                            بيانات معاينة · السعر والطلب تجريبيان
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="quiz-weight-note">{weightExplanation}</p>
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
            <button type="button" className="btn secondary quiz-restart" onClick={restart}>
              ابدأ من جديد
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function RecipeCards() {
  const { experience: copy, home } = useSiteContent();
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
                backgroundImage: `url("${home.recipesImage}")`,
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
  const { experience: copy, home } = useSiteContent();
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
