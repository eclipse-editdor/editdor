interface IDatalistInputProps {
  id: string;
  label: string;
  labelClassname?: string;
  inputClassname?: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const OptionsElement = ({ options }: { options: string[] }): JSX.Element[] => {
  const relationsHtml = options.map((current) => {
    return <option value={current} key={current} />;
  });
  return relationsHtml;
};

const DatalistInput: React.FC<IDatalistInputProps> = (props) => {
  return (
    <>
      <div className="p-1 pt-2">
        <label
          htmlFor={props.id}
          className={`pl-2 text-sm font-medium text-gray-400 ${props.labelClassname}`}
        >
          {props.label}
        </label>
        <input
          list={`${props.id}-list`}
          type="text"
          name={props.id}
          id={props.id}
          className={`w-full rounded-md border-2 border-gray-600 bg-gray-600 p-2 text-white focus:border-blue-500 focus:outline-none sm:text-sm ${props.inputClassname}`}
          placeholder={`${props.placeholder}`}
          value={props.value}
          onChange={props.onChange}
        />
        <datalist id={`${props.id}-list`}>
          <OptionsElement options={props.options}></OptionsElement>
        </datalist>

        <span
          id={`link-${props.id}-info`}
          className="pl-2 text-xs text-red-400"
        ></span>
      </div>
    </>
  );
};

export default DatalistInput;
