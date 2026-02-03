"use client";
import React from "react";
import { Dropdown } from "react-bootstrap";

type GraphSelectedProps = {
  title: string;
  optionsList: [string[]] | [string[], string[]];
  selectCount?: 1 | 2;
  selectedOption: string | [string, string];
  onSelect: ((option: string) => void) | [(option: string) => void, (option: string) => void];
};

export const GraphSelected: React.FC<GraphSelectedProps> = ({
  title,
  optionsList,
  selectCount = 1,
  selectedOption,
  onSelect,
}) => {
  return (
    <div className="GraphSelectDiv mb-2">
      <h5>{title}</h5>
      <div className="BothSelct">
        {/* First Dropdown */}
        <Dropdown className="DaysSelectDiv">
          <Dropdown.Toggle size="sm" variant="light">
            {Array.isArray(selectedOption) ? selectedOption[0] : selectedOption}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {optionsList[0].map((option, index) => (
              <Dropdown.Item key={index} onClick={() => Array.isArray(onSelect) ? onSelect[0](option) : onSelect(option)}>
                {option}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
        {/* Second Dropdown if selectCount === 2 */}
        {selectCount === 2 && optionsList[1] && (
          <Dropdown className="DaysSelectDiv">
            <Dropdown.Toggle size="sm" variant="light">
              {Array.isArray(selectedOption) ? selectedOption[1] : optionsList[1][0]}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {optionsList[1].map((option, index) => (
                <Dropdown.Item key={index} onClick={() => Array.isArray(onSelect) && onSelect[1](option)}>
                  {option}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        )}
      </div>
    </div>
  );
}; 