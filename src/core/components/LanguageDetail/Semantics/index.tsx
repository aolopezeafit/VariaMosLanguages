import { useCallback, useEffect, useRef, useState } from 'react';
import { ResponseModel } from '../../../../Domain/Core/Entity/ResponseModel';
import { useLanguageContext } from '../../../context/LanguageContext/LanguageContextProvider';
import useIntersectionObserver from '../../../hooks/useIntersectionObserver';
import Select from '../../InfiniteSelect';
import { SelectOptionProps } from '../../InfiniteSelect/index.types';
import { getServiceUrl } from '../../LanguageManager/index.utils';
import SourceCode from '../TextualMode/SourceCode/SourceCode';
import { formatCode } from '../index.utils';
import VisualSemanticEditor from './VisualSemanticEditor';
import { Dropdown, DropdownButton } from 'react-bootstrap';

const LIMIT = 20;

interface SemanticsState {
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface TranslationRule {
  param: string;
  constraint: string;
  selectedConstraint: string;
  deselectedConstraint: string;
}

interface RelationTranslationRule {
  params: string[];
  constraint: string;
}

interface AttributeTranslationRule {
  parent: string;
  param: string;
  template: string;
  constraint: string;
}

interface SemanticsProps {
  isActive: boolean;
}

export default function Semantics({ isActive }: SemanticsProps) {
  const { 
    semantics, 
    setSemantics, 
    elements, 
    relationships
  } = useLanguageContext();
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [relationTypes, setRelationTypes] = useState<string[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'form' | 'json'>('form');

  const [state, setState] = useState<SemanticsState>({
    isLoading: true,
    isInitialized: false,
    error: null
  });

  const [semanticsMap, setSemanticsMap] = useState<Map<number, string>>(
    new Map()
  );
  const [selectedOption, setSelectedOption] = useState<SelectOptionProps>({
    label: '',
    value: '',
  });

  // TODO: Refactor: move search input logic to a custom hook or a Higher Order Component
  const [searchInput, setSearchInput] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchInput, setDebouncedSearchInput] = useState('');
  const [semanticOptions, setSemanticOptions] = useState<SelectOptionProps[]>(
    []
  );
  const [isFetchingSemantics, setIsFetchingSemantics] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  
  const hasProcessedInitialLoad = useRef(false);

  // Manejar el cambio de modo de vista
  const handleSwitchToForm = () => setViewMode('form');
  const handleSwitchToJson = () => setViewMode('json');

  const isValidSemantics = useCallback((semantics: string | undefined): boolean => {
    try {
      if (!semantics) return false;
      const parsed = JSON.parse(semantics);
      return (
        parsed.hasOwnProperty('elementTypes') &&
        Array.isArray(parsed.elementTypes) &&
        parsed.hasOwnProperty('elementTranslationRules') &&
        Array.isArray(parsed.elementTranslationRules) &&
        parsed.hasOwnProperty('relationTypes') &&
        Array.isArray(parsed.relationTypes) &&
        parsed.hasOwnProperty('relationTranslationRules') &&
        Array.isArray(parsed.relationTranslationRules)
      );
    } catch (e) {
      return false;
    }
  }, []);

  const processSemantics = useCallback(async () => {
    if (!isActive || hasProcessedInitialLoad.current) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Si ya existe una semántica válida, la respetamos
      if (isValidSemantics(semantics)) {
        setState({ 
          isLoading: false, 
          isInitialized: true, 
          error: null 
        });
        hasProcessedInitialLoad.current = true;
        return;
      }

      // Si no hay elementos o relaciones, mostramos error
      if (!elements.length && !relationships.length) {
        setState(prev => ({
          ...prev,
          error: 'Please define language elements and relationships first',
          isLoading: false
        }));
        return;
      }

      // Crear nueva semántica basada en elementos actuales
      const initialSemantics = {
        elementTypes: Array.from(new Set(elements.map(element => element.name))),
        relationTypes: Array.from(
          relationships.reduce((types, relationship) => {
            const typeProperty = relationship.properties?.find(
              (prop) => prop.name === "Type"
            );
            if (typeProperty?.possibleValues) {
              typeProperty.possibleValues.forEach((value) => types.add(value));
            }
            return types;
          }, new Set<string>())
        ),
        elementTranslationRules: {},
        relationTranslationRules: {},
        attributeTypes: [],
        hierarchyTypes: [],
        typingRelationTypes: ["IndividualCardinality"],
        relationPropertySchema: {
          type: {
            key: "value",
            index: 0
          }
        }
      };

      setSemantics(JSON.stringify(initialSemantics, null, 2));
      setState({ 
        isLoading: false, 
        isInitialized: true, 
        error: null 
      });
      hasProcessedInitialLoad.current = true;

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Error initializing semantics',
        isLoading: false
      }));
      console.error("Error processing semantics:", error);
    }
  }, [isActive, elements, relationships, semantics, setSemantics, isValidSemantics]);

  useEffect(() => {
    if (isActive) {
      processSemantics();
    }
  }, [isActive, processSemantics]);

  // Función para parsear la semántica actual
  const parseCurrentSemantics = useCallback(() => {
    try {
      const parsedSemantics = semantics ? JSON.parse(semantics) : {};
      return {
        elementTypes: parsedSemantics.elementTypes || [],
        elementTranslationRules: parsedSemantics.elementTranslationRules || {},
        relationTypes: parsedSemantics.relationTypes || [],
        relationTranslationRules: parsedSemantics.relationTranslationRules || {},
        attributeTypes: parsedSemantics.attributeTypes || [],
        attributeTranslationRules: parsedSemantics.attributeTranslationRules || {},
        // Añadir otros campos según sea necesario (Los siguientes puede hierarchyTypes, typingRelationTypes, etc.)
      };
    } catch (e) {
      console.error('Error parsing semantics:', e);
      return {
        elementTypes: [],
        elementTranslationRules: {},
        relationTypes: [],
        relationTranslationRules: {},
        attributeTypes: [],
        attributeTranslationRules: {},
      };
    }
  }, [semantics]);
  
  // Sincronizar el estado local con la semántica
  useEffect(() => {
    const { elementTypes } = parseCurrentSemantics();
    setSelectedElements(elementTypes);
    const { relationTypes } = parseCurrentSemantics();
    setRelationTypes(relationTypes);
    const { attributeTypes } = parseCurrentSemantics();
    setAttributeTypes(attributeTypes);
  }, [semantics, parseCurrentSemantics]);

  // Manejar el cambio de elementos seleccionados
  const handleElementsChange = (elements: string[]) => {
    const currentSemantics = parseCurrentSemantics();
    const updatedSemantics = {
      ...currentSemantics,
      elementTypes: elements,
    };
    setSemantics(JSON.stringify(updatedSemantics, null, 2));
    setSelectedElements(elements);
  };

  // Manejar el cambio de relationTypes
  const handleRelationsChange = (relations: string[]) => {
    const currentSemantics = parseCurrentSemantics();
    const updatedSemantics = {
        ...currentSemantics,
        relationTypes: relations,
    };
    setSemantics(JSON.stringify(updatedSemantics, null, 2));
    setRelationTypes(relations);
};

  const handleTranslationRuleChange = (elementName: string, rule: TranslationRule) => {
    const currentSemantics = parseCurrentSemantics();
    const updatedSemantics = {
      ...currentSemantics,
      elementTranslationRules: {
        ...currentSemantics.elementTranslationRules,
        [elementName]: rule,
      },
    };
    setSemantics(JSON.stringify(updatedSemantics, null, 2));
  };

  const handleRelationTranslationRuleChange = (
    relationName: string,
    rule: RelationTranslationRule
  ) => {
    const currentSemantics = parseCurrentSemantics();
    const updatedSemantics = {
      ...currentSemantics,
      relationTranslationRules: {
        ...currentSemantics.relationTranslationRules,
        [relationName]: rule,
      },
    };
    setSemantics(JSON.stringify(updatedSemantics, null, 2));
  };

  const handleAttributeTypesChange = (attributes: string[]) => {
    const currentSemantics = parseCurrentSemantics();
    const updatedSemantics = {
      ...currentSemantics,
      attributeTypes: attributes,
    };
    setSemantics(JSON.stringify(updatedSemantics, null, 2));
    setAttributeTypes(attributes);
  };

  const handleAttributeTranslationRuleChange = (
    attributeName: string,
    rule: AttributeTranslationRule
  ) => {
    const currentSemantics = parseCurrentSemantics();
    const updatedSemantics = {
      ...currentSemantics,
      attributeTranslationRules: {
        ...currentSemantics.attributeTranslationRules,
        [attributeName]: rule,
      },
    };
    setSemantics(JSON.stringify(updatedSemantics, null, 2));
  };

  const handleSelect = (option: SelectOptionProps) => {
    const selectedSemantics =
      semanticsMap.get(parseInt(option.value) || 0) || {};

    setSemantics(formatCode(selectedSemantics as any));
    setSelectedOption(option);
    setSearchInput(option.label);
    setSearchValue('');
  };

  const transformToSelectOptions = (
    semantics: { id: number; name: string; type: string }[]
  ): SelectOptionProps[] => {
    if (!semantics) return [];

    return semantics?.map(({ id, name, type }) => {
      return {
        label: `${name}: [${type}]`,
        value: `${id}`,
      } as SelectOptionProps;
    });
  };

  const { lastEntryRef, setHasMore, page } =
    useIntersectionObserver(isFetchingSemantics);

  //Todo: move this to a service file
  const fetchAndSetSemantics = useCallback(async () => {
    const route = getServiceUrl('v2', 'languages', 'semantics');
    try {
      setIsFetchingSemantics(true);
      const url = new URL(route);
      const params = url.searchParams;

      if (debouncedSearchInput) {
        params.append('search', debouncedSearchInput);
      }

      params.append('pageNumber', page.toString());
      params.append('pageSize', LIMIT.toString());

      const httpResponse = await fetch(url);
      const responseContent = await httpResponse.json();

      const result: ResponseModel<any[]> = new ResponseModel<any[]>();
      Object.assign(result, { data: [] }, responseContent);

      if (!httpResponse.ok) {
        throw new Error(`${result.errorCode}: ${result.message}`);
      }

      if (page === 1) setSemanticOptions([]);

      setSemanticsMap((prev) => {
        result.data.forEach(({ id, semantics }) => prev.set(id, semantics));

        return prev;
      });
      setSemanticOptions((prev) => [
        ...prev,
        ...transformToSelectOptions(result?.data || []),
      ]);
      setTotalItems(result?.totalCount || 0);
    } catch (error) {
      console.log(
        `Error trying to connect to the ${route} service. Error: ${error}`
      );
    } finally {
      setIsFetchingSemantics(false);
    }
  }, [page, debouncedSearchInput]);

  useEffect(() => {
    if (totalItems === 0) return;
    if (!isFetchingSemantics) {
      setHasMore(semanticOptions?.length < totalItems);
    }
  }, [semanticOptions, totalItems, isFetchingSemantics, setHasMore]);

  useEffect(() => {
    fetchAndSetSemantics();
  }, [page, fetchAndSetSemantics]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchInput(searchValue);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchValue]);

  const onSearchChange = (search: string) => {
    setSearchInput(search);
    setSearchValue(search);
  };

  return (
    <div>
      {state.isLoading ? (
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : state.error ? (
        <div className="alert alert-danger" role="alert">
          {state.error}
        </div>
      ) : (
        <>
        
        <Select
          options={semanticOptions}
          selected={selectedOption}
          placeholder='Select a semantic'
          handleSelect={handleSelect}
          isFetchingOptions={isFetchingSemantics}
          lastOptionRef={lastEntryRef}
          isSearchable={true}
          searchInput={searchInput}
          setSearchInput={onSearchChange}
        />

        {/* DropDown button para elegir entre el formulario o el modo textual */}
        <div>
          <DropdownButton size="sm" title="Mode" variant="primary" id="modeDropdown" className="mb-3">
            <Dropdown.Item onClick={handleSwitchToForm}>Visual Editor</Dropdown.Item>
            <Dropdown.Item onClick={handleSwitchToJson}>Textual editor</Dropdown.Item>
          </DropdownButton>

          {viewMode === "form" ? (
            <VisualSemanticEditor
              elements={elements}
              selectedElements={selectedElements}
              elementTranslationRules={parseCurrentSemantics().elementTranslationRules}
              relationTypes={relationTypes}
              relationTranslationRules={parseCurrentSemantics().relationTranslationRules}
              attributeTypes={attributeTypes}
              attributeTranslationRules={parseCurrentSemantics().attributeTranslationRules}
              onElementsChange={handleElementsChange}
              onTranslationRuleChange={handleTranslationRuleChange}
              onRelationsChange={handleRelationsChange}
              onRelationTranslationRuleChange={handleRelationTranslationRuleChange}
              onAttributeTypesChange={handleAttributeTypesChange}
              onAttributeTranslationRuleChange={handleAttributeTranslationRuleChange}
            />
          ) : (
            <SourceCode code={semantics} dispatcher={setSemantics} />
          )}
        </div>
        </>
      )}
    </div>
  );
}