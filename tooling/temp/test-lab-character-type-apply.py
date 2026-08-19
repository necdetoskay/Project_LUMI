from pathlib import Path

path = Path("apps/web/app/app/settings/test-lab/onboarding-test-runner.tsx")
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"Expected exactly one match, found {count}: {old[:100]!r}"
        )
    text = text.replace(old, new, 1)


replace_once(
    '''const DEFAULT_STATE = JSON.stringify(
  {
    characterType: { key: "fantastic" },
    universe: { key: "new_world" },
  },
  null,
  2,
);''',
    '''const CHARACTER_TYPE_PHASE_ID = "character_type";
const CHARACTER_TYPE_OPTIONS = [
  { key: "human", label: "İnsan" },
  { key: "animal", label: "Hayvan" },
  { key: "fantastic", label: "Fantastik" },
  { key: "synthetic", label: "Sentetik" },
] as const;
type CharacterTypeKey = (typeof CHARACTER_TYPE_OPTIONS)[number]["key"];

const DEFAULT_STATE = JSON.stringify(
  {
    universe: { key: "new_world" },
  },
  null,
  2,
);''',
)

replace_once(
    'const LAST_LOCALE_KEY = "lumi.testLab.locale";',
    'const LAST_LOCALE_KEY = "lumi.testLab.locale";\nconst LAST_CHARACTER_TYPE_KEY = "lumi.testLab.characterType";',
)

replace_once(
    '  const [locale, setLocale] = useState("tr");\n  const [initialStateText, setInitialStateText] = useState(DEFAULT_STATE);',
    '  const [locale, setLocale] = useState("tr");\n  const [characterType, setCharacterType] =\n    useState<CharacterTypeKey>("fantastic");\n  const [initialStateText, setInitialStateText] = useState(DEFAULT_STATE);',
)

replace_once(
    '''    const rememberedLocale = window.localStorage.getItem(LAST_LOCALE_KEY);

    const nextHouseholdId''',
    '''    const rememberedLocale = window.localStorage.getItem(LAST_LOCALE_KEY);
    const rememberedCharacterType = window.localStorage.getItem(
      LAST_CHARACTER_TYPE_KEY,
    );

    const nextHouseholdId''',
)

replace_once(
    '''    if (rememberedLocale === "tr" || rememberedLocale === "en") {
      setLocale(rememberedLocale);
    }

    const storedContext''',
    '''    if (rememberedLocale === "tr" || rememberedLocale === "en") {
      setLocale(rememberedLocale);
    }
    if (
      CHARACTER_TYPE_OPTIONS.some(
        (option) => option.key === rememberedCharacterType,
      )
    ) {
      setCharacterType(rememberedCharacterType as CharacterTypeKey);
    }

    const storedContext''',
)

replace_once(
    '''    window.localStorage.setItem(LAST_LOCALE_KEY, locale);
  }, [householdId, childProfileId, modelSlug, locale]);''',
    '''    window.localStorage.setItem(LAST_LOCALE_KEY, locale);
    window.localStorage.setItem(LAST_CHARACTER_TYPE_KEY, characterType);
  }, [householdId, childProfileId, modelSlug, locale, characterType]);''',
)

replace_once(
    '''        const first = nextPhases.find(
          (phase: Phase) => phase.testable && nextSupported.includes(phase.id),
        );
        if (first) setPhaseId((current) => current || first.id);''',
    '''        const first =
          nextPhases.find(
            (phase: Phase) => phase.id === CHARACTER_TYPE_PHASE_ID,
          ) ??
          nextPhases.find(
            (phase: Phase) => phase.testable && nextSupported.includes(phase.id),
          );
        if (first) setPhaseId((current) => current || first.id);''',
)

replace_once(
    '''  const currentIndex = runnablePhases.findIndex(
    (phase) => phase.id === phaseId,
  );
  const currentPhase = currentIndex >= 0 ? runnablePhases[currentIndex] : null;''',
    '''  const currentIndex = runnablePhases.findIndex(
    (phase) => phase.id === phaseId,
  );
  const currentPhase = phases.find((phase) => phase.id === phaseId) ?? null;
  const currentIsCharacterType = phaseId === CHARACTER_TYPE_PHASE_ID;''',
)

replace_once(
    '''    if (!sessionId || !parentStateId || !phaseId || !currentPhase) return;
    if (promptDrafts[phaseId]) return;''',
    '''    if (!sessionId || !parentStateId || !phaseId || !currentPhase) return;
    if (currentIsCharacterType) return;
    if (promptDrafts[phaseId]) return;''',
)

replace_once(
    '''    currentPhase,
    currentRuns,''',
    '''    currentPhase,
    currentIsCharacterType,
    currentRuns,''',
)

replace_once(
    '''      const initialState = JSON.parse(initialStateText) as Record<
        string,
        unknown
      >;
      const payload = await post({''',
    '''      const parsedInitialState = JSON.parse(initialStateText) as Record<
        string,
        unknown
      >;
      const initialState = {
        ...parsedInitialState,
        characterType: { key: characterType },
      };
      const payload = await post({''',
)

replace_once(
    '''      const first = runnablePhases[0];
      if (first) setPhaseId(first.id);''',
    '''      const first =
        phases.find((phase) => phase.id === CHARACTER_TYPE_PHASE_ID) ??
        runnablePhases[0];
      if (first) setPhaseId(first.id);''',
)

marker = '''          <label className={styles.field}>
            Dil
            <select
              className={styles.input}
              value={locale}'''
if marker not in text:
    raise SystemExit("Could not find locale field marker")
character_field = '''          <label className={styles.field}>
            Karakter tipi
            <select
              className={styles.input}
              value={characterType}
              disabled={busy}
              onChange={(event) => {
                setCharacterType(event.target.value as CharacterTypeKey);
                resetSessionState();
                setPhaseId(CHARACTER_TYPE_PHASE_ID);
              }}
            >
              {CHARACTER_TYPE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
'''
text = text.replace(marker, character_field + marker, 1)

replace_once(
    '''            <p className={styles.muted}>
              {runnablePhases.length} production-backed aşama
            </p>''',
    '''            <p className={styles.muted}>
              {runnablePhases.length} LLM üretim aşaması
            </p>''',
)

replace_once(
    '''              const supported =
                phase.testable && supportedIds.includes(phase.id);
              const completed''',
    '''              const selectionPhase = phase.id === CHARACTER_TYPE_PHASE_ID;
              const supported =
                selectionPhase ||
                (phase.testable && supportedIds.includes(phase.id));
              const completed''',
)

replace_once(
    '''                    {!supported
                      ? "backend desteği yok"
                      : completed''',
    '''                    {selectionPhase
                      ? `seçim aşaması · ${
                          CHARACTER_TYPE_OPTIONS.find(
                            (option) => option.key === characterType,
                          )?.label ?? characterType
                        }`
                      : !supported
                        ? "Test Lab bağlantısı henüz yok"
                        : completed''',
)

replace_once(
    '''              {!sessionId ? (
                <div className={styles.emptyState}>
                  Promptu ve sonuçları görmek için önce test oturumu oluşturun.
                </div>
              ) : (''',
    '''              {currentIsCharacterType ? (
                <section className={styles.promptCard}>
                  <h3>Karakter tipi seçimi</h3>
                  <p className={styles.muted}>
                    Bu aşama LLM çağrısı yapmaz. Seçilen tip yeni sandbox
                    oturumunun state&apos;ine yazılır ve sonraki üretim promptlarına
                    context olarak aktarılır.
                  </p>
                  <label className={styles.field}>
                    Karakter tipi
                    <select
                      className={styles.input}
                      value={characterType}
                      disabled={busy}
                      onChange={(event) => {
                        setCharacterType(event.target.value as CharacterTypeKey);
                        resetSessionState();
                      }}
                    >
                      {CHARACTER_TYPE_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className={styles.muted}>
                    Yeni seçimden sonra test oturumunu yeniden oluşturun. Böylece
                    Character Identity ve sonraki aşamalardaki promptlar bu tipi
                    kullanır.
                  </p>
                </section>
              ) : !sessionId ? (
                <div className={styles.emptyState}>
                  Promptu ve sonuçları görmek için önce test oturumu oluşturun.
                </div>
              ) : (''',
)

path.write_text(text)
